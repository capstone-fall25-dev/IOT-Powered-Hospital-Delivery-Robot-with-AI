#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, QoSReliabilityPolicy, QoSHistoryPolicy
from sensor_msgs.msg import Image, CameraInfo
from cv_bridge import CvBridge
import cv2
import base64
import requests
import time
import os
import threading
from queue import Queue, Empty
from get_api_url import get_api

os.environ['OPENCV_LOG_LEVEL'] = 'OFF'
BASE_URL = get_api()

# Optional: Install turbojpeg để tăng tốc 3-5x
# pip install PyTurboJPEG
try:
    from turbojpeg import TurboJPEG
    turbo_jpeg = TurboJPEG()
    USE_TURBO = True
except ImportError:
    USE_TURBO = False


class CameraThread(threading.Thread):
    """Thread tối ưu để đọc camera liên tục"""
    def __init__(self, camera):
        super().__init__(daemon=True)
        self.camera = camera
        self.frame = None
        self.new_frame = False
        self.lock = threading.Lock()
        self.running = True

    def run(self):
        while self.running:
            if self.camera and self.camera.isOpened():
                # ✅ Grab 2 lần để skip frame cũ trong buffer
                self.camera.grab()
                ret, frame = self.camera.read()
                if ret:
                    with self.lock:
                        self.frame = frame
                        self.new_frame = True

    def get_frame(self):
        with self.lock:
            if self.new_frame:
                self.new_frame = False
                return self.frame
            return None

    def stop(self):
        self.running = False


class AsyncHTTPSender(threading.Thread):
    """Thread tối ưu gửi HTTP với queue nhỏ"""
    def __init__(self, api_url):
        super().__init__(daemon=True)
        self.api_url = api_url
        self.queue = Queue(maxsize=1)  # Chỉ 1 frame - drop ngay nếu đầy
        self.running = True
        self.session = requests.Session()  # Reuse connection

    def run(self):
        while self.running:
            try:
                data = self.queue.get(timeout=0.5)
                self.session.post(self.api_url, json=data, timeout=0.2)
            except Empty:
                pass
            except:
                pass

    def send(self, data):
        try:
            self.queue.put_nowait(data)
        except:
            # Queue đầy - drop frame cũ
            try:
                self.queue.get_nowait()
                self.queue.put_nowait(data)
            except:
                pass

    def stop(self):
        self.running = False
        self.session.close()


class WebcamPublisher(Node):
    def __init__(self):
        super().__init__('webcam_publisher')

        # ✅ QoS tối ưu cho sensor data - best_effort + queue 1
        sensor_qos = QoSProfile(
            reliability=QoSReliabilityPolicy.BEST_EFFORT,
            history=QoSHistoryPolicy.KEEP_LAST,
            depth=1  # Chỉ giữ 1 message mới nhất
        )

        self.image_pub = self.create_publisher(Image, '/camera/image_raw', sensor_qos)
        self.info_pub = self.create_publisher(CameraInfo, '/camera/camera_info', sensor_qos)
        self.bridge = CvBridge()

        self.cap = None
        self.camera_thread = None
        self.last_connect_attempt = 0

        self.api_url = f"{BASE_URL}/api/RobotCamera/SendFrame"
        self.http_sender = AsyncHTTPSender(self.api_url)
        self.http_sender.start()

        self.get_logger().info(f"📷 Khởi tạo WebcamPublisher (TurboJPEG: {USE_TURBO})...")

        # Timer 30 FPS
        self.timer = self.create_timer(1.0 / 30.0, self.publish_frame)

    def try_open_camera(self):
        now = time.time()
        if now - self.last_connect_attempt < 2:
            return False
        self.last_connect_attempt = now

        for i in range(10):
            cap = cv2.VideoCapture(i, cv2.CAP_V4L2)  # V4L2 backend nhanh hơn
            if cap.isOpened():
                # ✅ Tối ưu cực mạnh
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                cap.set(cv2.CAP_PROP_FPS, 30)
                cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
                cap.set(cv2.CAP_PROP_AUTOFOCUS, 0)  # Tắt autofocus giảm jitter
                
                self.cap = cap
                
                # Khởi động camera thread
                if self.camera_thread:
                    self.camera_thread.stop()
                self.camera_thread = CameraThread(self.cap)
                self.camera_thread.start()
                
                time.sleep(0.05)
                return True

        return False

    def publish_frame(self):
        if self.cap is None or not self.cap.isOpened():
            self.try_open_camera()
            return

        # ✅ Chỉ lấy frame MỚI, bỏ qua nếu chưa có frame mới
        frame = self.camera_thread.get_frame() if self.camera_thread else None
        if frame is None:
            return

        # 🔄 Lật ảnh
        frame = cv2.rotate(frame, cv2.ROTATE_180)

        # --- ROS2 publish ---
        img_msg = self.bridge.cv2_to_imgmsg(frame, encoding='bgr8')
        img_msg.header.stamp = self.get_clock().now().to_msg()
        img_msg.header.frame_id = "camera_link"
        self.image_pub.publish(img_msg)

        # --- CameraInfo publish ---
        cam_info = CameraInfo()
        cam_info.header = img_msg.header
        cam_info.width = frame.shape[1]
        cam_info.height = frame.shape[0]
        fx = fy = 500.0
        cx = frame.shape[1] / 2
        cy = frame.shape[0] / 2
        cam_info.k = [fx, 0, cx, 0, fy, cy, 0, 0, 1]
        cam_info.p = [fx, 0, cx, 0, 0, fy, cy, 0, 0, 0, 1, 0]
        self.info_pub.publish(cam_info)

        # --- Encode tối ưu ---
        # ✅ Resize nhỏ hơn trước khi encode để giảm thời gian
        small_frame = cv2.resize(frame, (320, 240), interpolation=cv2.INTER_LINEAR)
        
        if USE_TURBO:
            # TurboJPEG nhanh hơn 3-5x
            jpg_buffer = turbo_jpeg.encode(small_frame, quality=75)
        else:
            # Fallback OpenCV
            _, jpg_buffer = cv2.imencode('.jpg', small_frame, 
                                         [cv2.IMWRITE_JPEG_QUALITY, 75,
                                          cv2.IMWRITE_JPEG_OPTIMIZE, 1])
            jpg_buffer = jpg_buffer.tobytes()

        jpg_as_text = base64.b64encode(jpg_buffer).decode('utf-8')

        data = {
            "Image_b64": jpg_as_text,
            "FrameId": "cam_main",
            "Timestamp": int(time.time() * 1000)
        }

        # ✅ Gửi async
        self.http_sender.send(data)

    def destroy_node(self):
        if self.camera_thread:
            self.camera_thread.stop()
        if self.http_sender:
            self.http_sender.stop()
        if self.cap:
            self.cap.release()
        cv2.destroyAllWindows()
        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    node = WebcamPublisher()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
