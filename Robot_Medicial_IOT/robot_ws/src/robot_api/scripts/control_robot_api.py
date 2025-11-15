#!/usr/bin/env python3
"""
Robot Motor Control Listener
- Nhận lệnh điều khiển qua SignalR event 'ReceiveMotorCommand'
- Xuất tốc độ ra topic /cmd_vel_teleop
"""

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from signalrcore.hub_connection_builder import HubConnectionBuilder
import threading
from rclpy.qos import QoSProfile
from get_api_url import get_api
BASE_URL = get_api()
HUB_URL = f"{BASE_URL}/hubs/robotposition"  # ✅ Đúng Hub backend

MAX_LINEAR_VEL = 0.22
MAX_ANGULAR_VEL = 2.84
LIN_VEL_STEP = 0.05
ANG_VEL_STEP = 0.1

class RobotMotorControl(Node):
    def __init__(self):
        super().__init__('robot_motor_control_listener')
        qos = QoSProfile(depth=10)
        self.publisher = self.create_publisher(Twist, '/cmd_vel', qos)
        self.current_linear_vel = 0.0
        self.current_angular_vel = 0.0
        self.get_logger().info("🤖 Robot Motor Control Node initialized")

        self.connect_signalr()

    def constrain(self, value, min_val, max_val):
        return max(min(value, max_val), min_val)

    def update_velocity(self, linear_change=0.0, angular_change=0.0):
        self.current_linear_vel = self.constrain(
            self.current_linear_vel + linear_change, -MAX_LINEAR_VEL, MAX_LINEAR_VEL
        )
        self.current_angular_vel = self.constrain(
            self.current_angular_vel + angular_change, -MAX_ANGULAR_VEL, MAX_ANGULAR_VEL
        )

        twist = Twist()
        twist.linear.x = self.current_linear_vel
        twist.angular.z = self.current_angular_vel
        self.publisher.publish(twist)
        self.get_logger().info(
            f"📡 Published → Linear: {self.current_linear_vel:.2f}, Angular: {self.current_angular_vel:.2f}"
        )

    def handle_motor_command(self, command):
        key = command.get("key")
        if not key:
            self.get_logger().warn("⚠️ Missing key in motor command")
            return

        key = key.lower()
        self.get_logger().info(f"Key: {key}")
        if key == "w":
            self.update_velocity(linear_change=LIN_VEL_STEP)
        elif key == "x":
            self.update_velocity(linear_change=-LIN_VEL_STEP)
        elif key == "a":
            self.update_velocity(angular_change=ANG_VEL_STEP)
        elif key == "d":
            self.update_velocity(angular_change=-ANG_VEL_STEP)
        elif key == "s":
            self.current_linear_vel = 0.0
            self.current_angular_vel = 0.0
            self.update_velocity(0.0, 0.0)
        else:
            self.get_logger().warn(f"⚠️ Unknown key: {key}")

    def connect_signalr(self):
        def run():
            try:
                self.get_logger().info(f"🔗 Connecting to SignalR Hub at {HUB_URL}")
                self.hub = (
                    HubConnectionBuilder()
                    .with_url(HUB_URL)
                    .with_automatic_reconnect({
                        "type": "raw",
                        "keep_alive_interval": 10,
                        "reconnect_interval": 5
                    })
                    .build()
                )
                self.hub.on("ReceiveMotorCommand", lambda args: self.handle_motor_command(args[0]))
                self.hub.start()
                self.get_logger().info("🟢 Connected to SignalR Hub successfully!")
            except Exception as e:
                self.get_logger().error(f"❌ Failed to connect to Hub: {e}")

        threading.Thread(target=run, daemon=True).start()

    def destroy_node(self):
        if hasattr(self, 'hub'):
            try:
                self.hub.stop()
                self.get_logger().info("🛑 Disconnected from Hub")
            except Exception:
                pass
        super().destroy_node()

def main(args=None):
    rclpy.init(args=args)
    node = RobotMotorControl()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
