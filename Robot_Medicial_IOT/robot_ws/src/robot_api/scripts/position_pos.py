from geometry_msgs.msg import PoseWithCovarianceStamped
from nav_msgs.msg import Odometry
import rclpy
from rclpy.node import Node
import requests, json, math, time


class RobotPositionUploader(Node):
    def __init__(self):
        super().__init__('robot_position_uploader')

        self.robot_id = 1
        self.server_url = f"http://157.66.26.217:5000/api/robots/{self.robot_id}/position"

        self.current_x = None
        self.current_y = None
        self.current_yaw = None
        self.source_topic = None

        # ✅ Kiểm tra topic hiện có
        topics = dict(self.get_topic_names_and_types())
        self.get_logger().info(f"🔍 Danh sách topic hiện có: {list(topics.keys())}")

        if '/amcl_pose' in topics:
            self.get_logger().info("✅ Dùng topic /amcl_pose (ưu tiên)")
            self.sub = self.create_subscription(PoseWithCovarianceStamped, '/amcl_pose', self.amcl_callback, 10)
            self.source_topic = 'amcl_pose'
        elif '/odom' in topics:
            self.get_logger().info("⚠️ /amcl_pose không có → dùng /odom")
            self.sub = self.create_subscription(Odometry, '/odom', self.odom_callback, 10)
            self.source_topic = 'odom'
        else:
            self.get_logger().warn("❌ Không tìm thấy /amcl_pose hoặc /odom! Node vẫn khởi chạy, nhưng chưa có dữ liệu.")

        # Gửi dữ liệu định kỳ
        self.timer = self.create_timer(1.0, self.send_to_server)

    # ========== CALLBACKS ==========
    def quaternion_to_yaw(self, qx, qy, qz, qw):
        siny_cosp = 2.0 * (qw * qz + qx * qy)
        cosy_cosp = 1.0 - 2.0 * (qy * qy + qz * qz)
        return math.degrees(math.atan2(siny_cosp, cosy_cosp))

    def amcl_callback(self, msg):
        self.current_x = msg.pose.pose.position.x
        self.current_y = msg.pose.pose.position.y
        q = msg.pose.pose.orientation
        self.current_yaw = self.quaternion_to_yaw(q.x, q.y, q.z, q.w)
        self.get_logger().info(f"📍 [AMCL] x={self.current_x:.2f}, y={self.current_y:.2f}, yaw={self.current_yaw:.1f}°")

    def odom_callback(self, msg):
        self.current_x = msg.pose.pose.position.x
        self.current_y = msg.pose.pose.position.y
        q = msg.pose.pose.orientation
        self.current_yaw = self.quaternion_to_yaw(q.x, q.y, q.z, q.w)
        self.get_logger().info(f"📍 [Odom] x={self.current_x:.2f}, y={self.current_y:.2f}, yaw={self.current_yaw:.1f}°")

    def send_to_server(self):
        if self.current_x is None:
            return
        data = {"latitude": self.current_x, "longitude": self.current_y, "heading": self.current_yaw}
        try:
            res = requests.patch(self.server_url, json=data, timeout=3)
            if res.status_code == 200:
                self.get_logger().info(f"✅ Gửi thành công: {data}")
            else:
                self.get_logger().warn(f"⚠️ HTTP {res.status_code}: {res.text}")
        except Exception as e:
            self.get_logger().error(f"❌ Lỗi gửi API: {e}")


def main(args=None):
    rclpy.init(args=args)
    node = RobotPositionUploader()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.shutdown()
