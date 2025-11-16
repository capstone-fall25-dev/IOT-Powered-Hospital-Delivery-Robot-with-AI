#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseWithCovarianceStamped
from nav_msgs.msg import Odometry
import math
import threading
import requests

from signalrcore.hub_connection_builder import HubConnectionBuilder
from tf2_ros import Buffer, TransformListener

from get_api_url import get_api

# ==========================================================
# ⚙️ CONFIG
# ==========================================================
BASE_URL = get_api()


class RobotModePositionStreamer(Node):
    def __init__(self):
        super().__init__('robot_mode_position_streamer')

        # --- CONFIG ---
        self.robot_id = 1
        self.hub_url = f"{BASE_URL}/hubs/robotposition"
        self.api_url = f"{BASE_URL}/api/RobotMode/update-position"

        # --- State ---
        self.current_mode = None
        self.mapping_active = False
        self.sub = None  # active subscription

        # --- TF BUFFER ---
        self.tf_buffer = Buffer()
        self.tf_listener = TransformListener(self.tf_buffer, self)

        # --- SignalR Connection ---
        self.start_signalr_connection()

        # --- Timer to send position ---
        self.timer = self.create_timer(1.0, self.send_position_if_active)

        self.get_logger().info("🤖 RobotModePositionStreamer initialized.")

    # ==========================================================
    # 🧭 Convert quaternion → yaw (deg)
    def quaternion_to_yaw(self, qx, qy, qz, qw):
        siny_cosp = 2.0 * (qw * qz + qx * qy)
        cosy_cosp = 1.0 - 2.0 * (qy * qy + qz * qz)
        return math.degrees(math.atan2(siny_cosp, cosy_cosp))

    # ==========================================================
    # 🔌 SignalR Connection (Async thread)
    def start_signalr_connection(self):
        def run():
            self.get_logger().info(f"🔗 Connecting to SignalR Hub at {self.hub_url}")
            try:
                self.hub = (
                    HubConnectionBuilder()
                    .with_url(self.hub_url)
                    .with_automatic_reconnect({
                        "type": "raw",
                        "keep_alive_interval": 10,
                        "reconnect_interval": 5
                    })
                    .build()
                )

                self.hub.on("ReceiveRobotCommand", self.on_receive_robot_command)
                self.hub.start()

                self.get_logger().info("🟢 Connected to SignalR Hub successfully!")

            except Exception as e:
                self.get_logger().error(f"❌ Failed to connect to Hub: {e}")

        threading.Thread(target=run, daemon=True).start()

    # ==========================================================
    # 🛰️ SignalR callback (set mode)
    def on_receive_robot_command(self, command_data):
        if isinstance(command_data, list):
            command_data = command_data[0]

        mode = command_data.get("mode")
        map_name = command_data.get("map_name")

        self.get_logger().info(f"🛰️ Received robot command: mode={mode}, map={map_name}")

        self.current_mode = mode

        # Hủy subscription cũ
        if self.sub:
            self.destroy_subscription(self.sub)
            self.sub = None

        # --- MAPPING mode: use /odom ---
        if mode == "mapping":
            self.sub = self.create_subscription(
                Odometry, '/odom', self.odom_callback, 10
            )
            self.mapping_active = True
            self.get_logger().info("🗺️ [Mapping] Subscribed to /odom")

        # --- RUN_MAP or SAVE_MAP: use AMCL OR TF ---
        elif mode in ("run_map", "save_map"):
            self.sub = self.create_subscription(
                PoseWithCovarianceStamped, '/amcl_pose', self.amcl_callback, 10
            )
            self.mapping_active = True
            self.get_logger().info(f"🤖 [{mode}] Subscribed to /amcl_pose")

        else:
            self.mapping_active = False
            self.get_logger().info(f"⛔ Mode '{mode}' not active")

    # ==========================================================
    # 🧩 Callbacks (still used to update state if needed)
    def amcl_callback(self, msg):
        pass  # AMCL chỉ để đảm bảo TF được cập nhật → ta dùng TF làm chuẩn

    def odom_callback(self, msg):
        pass  # Ta vẫn dùng TF làm chuẩn pose

    # ==========================================================
    # 🔍 Lấy pose từ TF: map → base_link
    def get_tf_pose(self):
        try:
            trans = self.tf_buffer.lookup_transform(
                "map", "base_link", rclpy.time.Time()
            )

            x = trans.transform.translation.x
            y = trans.transform.translation.y
            q = trans.transform.rotation
            yaw = self.quaternion_to_yaw(q.x, q.y, q.z, q.w)

            return x, y, yaw

        except Exception as e:
            self.get_logger().warn(f"⚠️ TF lookup failed: {e}")
            return None

    # ==========================================================
    # 📡 Send robot position to backend
    def send_position_if_active(self):
        if not self.mapping_active:
            return

        pose = self.get_tf_pose()
        if not pose:
            return

        x, y, yaw = pose
        payload = {"x": x, "y": y, "theta": yaw}

        try:
            res = requests.post(self.api_url, json=payload, timeout=3)
            if res.status_code == 200:
                # self.get_logger().info(f"📍 Sent pose TF → {payload}")
                pass
            else:
                pass
                # self.get_logger().warn(f"⚠️ HTTP {res.status_code}: {res.text}")

        except Exception as e:
            self.get_logger().error(f"❌ Error sending pose: {e}")

    # ==========================================================
    def destroy_node(self):
        if hasattr(self, 'hub') and self.hub:
            try:
                self.hub.stop()
            except Exception:
                pass

        if self.sub:
            self.destroy_subscription(self.sub)

        super().destroy_node()


# ==========================================================
def main(args=None):
    rclpy.init(args=args)
    node = RobotModePositionStreamer()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
