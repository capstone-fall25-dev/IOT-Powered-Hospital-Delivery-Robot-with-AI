#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, CameraInfo
from cv_bridge import CvBridge
import cv2
import base64
import requests
import time
import os
from get_api_url import get_api

os.environ['OPENCV_LOG_LEVEL'] = 'OFF'
BASE_URL = get_api()

class WebcamPublisher(Node):
    def __init__(self):
        super().__init__('webcam_publisher')

        self.image_pub = self.create_publisher(Image, '/camera/image_raw', 10)
        self.info_pub = self.create_publisher(CameraInfo, '/camera/camera_info', 10)
        self.bridge = CvBridge()

        self.cap = None
        self.last_connect_attempt = 0

        self.api_url = f"{BASE_URL}/api/RobotCamera/SendFrame"
        self.get_logger().info("📷 Khởi tạo WebcamPublisher...")

        # Timer chạy 30 FPS
        self.timer = self.create_timer(1.0 / 30.0, self.publish_frame)

    # ------------------------------------------------------
    # 🔄 Hàm thử kết nối webcam (tự động reconnect)
    # ------------------------------------------------------
    def try_open_camera(self):
        now = time.time()
        if now - self.last_connect_attempt < 2:
            return False  # tránh spam mở camera
        self.last_connect_attempt = now

        # self.get_logger().info("🔄 Đang thử mở webcam...")

        for i in range(10):
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                self.cap = cap
                # self.get_logger().info(f"✅ Webcam mở thành công tại index {i}")
                return True

        # self.get_logger().warn("❌ Không tìm thấy camera. Chờ kết nối lại...")
        return False

    # ------------------------------------------------------
    # 🎥 Publish frame + reconnect logic
    # ------------------------------------------------------
    def publish_frame(self):
        # Nếu camera chưa mở → thử lại
        if self.cap is None or not self.cap.isOpened():
            self.try_open_camera()
            return

        ret, frame = self.cap.read()

        # Nếu đọc fail → thử reconnect
        if not ret:
            # self.get_logger().warn("⚠️ Không đọc được frame. Thử mở lại camera...")
            self.cap.release()
            self.cap = None
            return

        # 🔄 Lật ảnh nếu camera ngược
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

        # --- Encode Base64 ---
        _, buffer = cv2.imencode('.jpg', frame)
        jpg_as_text = base64.b64encode(buffer).decode('utf-8')

        data = {
            "Image_b64": jpg_as_text,
            "FrameId": "cam_main",
            "Timestamp": int(time.time() * 1000)
        }

        try:
            requests.post(self.api_url, json=data, timeout=0.5)
        except requests.exceptions.RequestException:
            pass  # không spam log

    # ------------------------------------------------------
    # 🔚 Cleanup
    # ------------------------------------------------------
    def destroy_node(self):
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
