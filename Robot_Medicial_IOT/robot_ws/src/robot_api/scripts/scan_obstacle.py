#!/usr/bin/env python3
import math
import threading
import time

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan, Range
from std_msgs.msg import Bool
import requests

from get_api_url import get_api

BASE_API = get_api()

API_HUB = f"{BASE_API}/hubs/ttsHub"
API_TTS = f"{BASE_API}/api/TTS"


class ScanObstacleAlert(Node):
    def __init__(self):
        super().__init__("scan_obstacle_alert")

        # ====== CẤU HÌNH 4 CẢM BIẾN VL05L0X PHÍA TRƯỚC ======
        self.topics_vl05 = ["/vl05_1", "/vl05_2", "/vl05_3", "/vl05_4"]
        self.vl05_states = {topic: False for topic in self.topics_vl05}

        # ====== TRẠNG THÁI PHÁT HIỆN VẬT CẢN ======
        self.laser_obstacle = False
        self.range_obstacle = False
        self.last_state = False

        self.last_tts_time = 0.0
        self.tts_cooldown_sec = 5.0  # giãn cách tối thiểu giữa 2 lần gửi TTS

        # Publisher /scan_emg (Bool)
        self.scan_emg_pub = self.create_publisher(Bool, "/scan_emg", 10)

        # Sub LaserScan /scan
        self.scan_sub = self.create_subscription(
            LaserScan,
            "/scan",
            self.scan_callback,
            10,
        )

        # Sub 4 cảm biến VL05 phía trước
        for topic in self.topics_vl05:
            self.create_subscription(
                Range,
                topic,
                lambda msg, topic=topic: self.range_callback(msg, topic),
                10,
            )

        self.get_logger().info("✅ ScanObstacleAlert node started")

    # =========================
    # XỬ LÝ LIDAR /scan THEO GÓC
    # =========================
    def check_laserscan_front(self, msg: LaserScan) -> bool:
        """
        Kiểm tra vật cản phía trước theo góc:
        - Lấy một nón phía trước ±FOV/2 (vd: ±15°) so với trục x robot
        - Nếu trong nón đó có khoảng cách trong 0.30m–0.40m thì coi là có vật cản
        """

        ranges = list(msg.ranges)
        if not ranges:
            return False

        # FOV phía trước (độ), vd 30° -> ±15°
        front_fov_deg = 30.0
        half_fov_rad = math.radians(front_fov_deg / 2.0)

        # Góc tương đối phía trước (rad)
        front_min_angle = -half_fov_rad
        front_max_angle = +half_fov_rad

        # Tính index trong mảng ranges tương ứng với 2 góc này
        # angle = angle_min + index * angle_increment
        # => index = (angle - angle_min) / angle_increment
        try:
            idx_min = math.ceil((front_min_angle - msg.angle_min) / msg.angle_increment)
            idx_max = math.floor((front_max_angle - msg.angle_min) / msg.angle_increment)
        except ZeroDivisionError:
            self.get_logger().warn("LaserScan angle_increment = 0, bỏ qua /scan")
            return False

        # Clamp index về [0, len(ranges)-1]
        n = len(ranges)
        idx_min = max(0, min(n - 1, idx_min))
        idx_max = max(0, min(n - 1, idx_max))

        if idx_max < idx_min:
            # Nếu vì lý do gì đó mà min/max bị đảo, đổi lại
            idx_min, idx_max = idx_max, idx_min

        min_dist = None
        for i in range(idx_min, idx_max + 1):
            r = ranges[i]
            if math.isinf(r) or math.isnan(r) or r <= 0.0:
                continue
            if min_dist is None or r < min_dist:
                min_dist = r

        if min_dist is None:
            return False

        return  30 <= min_dist <= 0.40

    def scan_callback(self, msg: LaserScan):
        self.laser_obstacle = self.check_laserscan_front(msg)
        self.update_obstacle_state()

    # =========================
    # XỬ LÝ 4 CẢM BIẾN VL05L0X
    # =========================
    def range_callback(self, msg: Range, topic_name: str):
        dist = msg.range

        if math.isinf(dist) or math.isnan(dist) or dist <= 0.0:
            in_range = False
        else:
            in_range = dist <= 0.40  

        self.vl05_states[topic_name] = in_range
        self.range_obstacle = any(self.vl05_states.values())

        self.update_obstacle_state()

    # =========================
    # GỘP TRẠNG THÁI & PUBLISH
    # =========================
    def update_obstacle_state(self):
        has_obstacle = self.laser_obstacle or self.range_obstacle

        emg_msg = Bool()
        emg_msg.data = has_obstacle
        self.scan_emg_pub.publish(emg_msg)

        now = time.time()

        if has_obstacle:
            if not self.last_state:
                # Vừa mới xuất hiện vật cản
                self.last_tts_time = now
                self.send_tts_alert_async("Phía trước có vật cản, vui lòng kiểm tra.")
            elif self.laser_obstacle and (now - self.last_tts_time) >= self.tts_cooldown_sec:
                # Vật cản vẫn còn (LIDAR), đọc lại theo cooldown
                self.send_tts_alert_async("Phía trước có vật cản, vui lòng kiểm tra.")
                self.last_tts_time = now
        # Nếu không có vật cản: chỉ cần cập nhật lại last_state
        self.last_state = has_obstacle


    # =========================
    # GỬI TTS LÊN API
    # =========================
    def send_tts_alert_async(self, text: str):
        threading.Thread(
            target=self.send_tts_alert, args=(text,), daemon=True
        ).start()

    def send_tts_alert(self, text: str):
        payload = {"text": text}
        try:
            resp = requests.post(API_TTS, json=payload, timeout=2.0)
            resp.raise_for_status()
            self.get_logger().info(f"📢 TTS alert sent: {text}")
        except Exception as e:
            self.get_logger().error(f"❌ Failed to send TTS alert: {e}")


def main(args=None):
    rclpy.init(args=args)
    node = ScanObstacleAlert()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
