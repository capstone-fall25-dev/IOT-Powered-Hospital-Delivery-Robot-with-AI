#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String

class ControlBox(Node):
    def __init__(self):
        super().__init__('control_box_node')
        self.pub = self.create_publisher(String, '/control_box', 10)

    def control_box(self):
        msg = String()
        msg.data = '0 1'
        self.pub.publish(msg)
        self.get_logger().info(f'📤 Published once: {msg.data}')

def main(args=None):
    rclpy.init(args=args)
    node = ControlBox()

    # 📤 Gửi 1 lần duy nhất
    node.control_box()

    # ⏱️ Chờ 0.5 giây để đảm bảo message gửi đi rồi mới shutdown
    node.get_clock().sleep_for(rclpy.time.Duration(seconds=0.5))

    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
