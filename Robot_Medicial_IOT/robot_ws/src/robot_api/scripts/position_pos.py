#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseWithCovarianceStamped
from nav_msgs.msg import Odometry
import math, threading, requests
from signalrcore.hub_connection_builder import HubConnectionBuilder


class RobotModePositionStreamer(Node):
    def __init__(self):
        super().__init__('robot_mode_position_streamer')

        # --- CONFIG ---
        self.robot_id = 1
        self.hub_url = "http://localhost:5170/hubs/robotposition"
        self.api_url = "http://localhost:5170/api/RobotMode/update-position"

        # --- State ---
        self.current_x = None
        self.current_y = None
        self.current_yaw = None
        self.current_mode = None
        self.mapping_active = False
        self.sub = None  # active subscription

        # --- SignalR Connection ---
        self.start_signalr_connection()

        # --- Timer (send position every 2s) ---
        self.timer = self.create_timer(2.0, self.send_position_if_active)

        self.get_logger().info("🤖 RobotModePositionStreamer initialized.")

    # ==========================================================
    # 🧭 Convert quaternion → yaw (deg)
    def quaternion_to_yaw(self, qx, qy, qz, qw):
        siny_cosp = 2.0 * (qw * qz + qx * qy)
        cosy_cosp = 1.0 - 2.0 * (qy * qy + qz * qz)
        return math.degrees(math.atan2(siny_cosp, cosy_cosp))

    # ==========================================================
    # 🛰️ SignalR connection and listener
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
    # 🤖 When a robot mode command is received
    def on_receive_robot_command(self, command_data):
        if isinstance(command_data, list):
            command_data = command_data[0]

        mode = command_data.get("mode")
        map_name = command_data.get("map_name")
        self.get_logger().info(f"🛰️ Received robot command: {mode} (map={map_name})")

        self.current_mode = mode

        # stop any existing subscription first
        if self.sub:
            self.destroy_subscription(self.sub)
            self.sub = None

        # choose topic based on mode
        if mode == "mapping":
            self.sub = self.create_subscription(
                Odometry, '/odom', self.odom_callback, 10
            )
            self.mapping_active = True
            self.get_logger().info("🗺️ [Mapping] Subscribed to /odom topic")

        elif mode in ("run_map", "save_map"):
            self.sub = self.create_subscription(
                PoseWithCovarianceStamped, '/amcl_pose', self.amcl_callback, 10
            )
            self.mapping_active = True
            self.get_logger().info(f"🤖 [{mode}] Subscribed to /amcl_pose topic")

        else:
            self.mapping_active = False
            self.get_logger().info(f"⛔ Mode '{mode}' not active for streaming")

    # ==========================================================
    # 🧩 Callbacks
    def amcl_callback(self, msg):
        pos = msg.pose.pose.position
        q = msg.pose.pose.orientation
        self.current_x = pos.x
        self.current_y = pos.y
        self.current_yaw = self.quaternion_to_yaw(q.x, q.y, q.z, q.w)
        self.get_logger().debug(
            f"📍 [AMCL] x={self.current_x:.2f}, y={self.current_y:.2f}, θ={self.current_yaw:.1f}"
        )

    def odom_callback(self, msg):
        pos = msg.pose.pose.position
        q = msg.pose.pose.orientation
        self.current_x = pos.x
        self.current_y = pos.y
        self.current_yaw = self.quaternion_to_yaw(q.x, q.y, q.z, q.w)
        self.get_logger().debug(
            f"📍 [Odom] x={self.current_x:.2f}, y={self.current_y:.2f}, θ={self.current_yaw:.1f}"
        )

    # ==========================================================
    # 📡 Send robot position via REST API when mode is active
    def send_position_if_active(self):
        if not self.mapping_active or self.current_x is None:
            return

        payload = {"x": self.current_x, "y": self.current_y, "theta": self.current_yaw}
        try:
            res = requests.post(self.api_url, json=payload, timeout=3)
            if res.status_code == 200:
                # self.get_logger().info(f"📍 Sent position → {payload}")
                pass
            else:
                self.get_logger().warn(f"⚠️ HTTP {res.status_code}: {res.text}")
        except Exception as e:
            self.get_logger().error(f"❌ Error sending position: {e}")

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
