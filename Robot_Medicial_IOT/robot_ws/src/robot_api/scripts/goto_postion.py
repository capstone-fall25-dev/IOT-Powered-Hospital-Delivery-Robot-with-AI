#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseStamped
from nav2_simple_commander.robot_navigator import BasicNavigator, TaskResult
from std_msgs.msg import String
import time, json, os, sys, signal, requests, logging, asyncio, threading
from signalrcore.hub_connection_builder import HubConnectionBuilder

# ============================================================
# ⚙️ Setup logging
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("RouteNavigator")

# ============================================================
# 🌍 BASE CONFIG
# ============================================================
from get_api_url import get_api
BASE_URL = get_api()
HUB_URL = f"{BASE_URL}/hubs/robotposition"
shutdown_requested = False


def signal_handler(signum, frame):
    global shutdown_requested
    print(f"\n🛑 Received signal {signum}, shutting down gracefully...")
    shutdown_requested = True


# ============================================================
# ⚙️ API CONFIG & HANDLER
# ============================================================
class APIConfig:
    def __init__(self):
        # API cập nhật trạng thái robot
        self.send_status_url = f"{BASE_URL}/api/robots/update-status"
        # ⭐ API text-only nhận % progress
        self.send_progress_url = f"{BASE_URL}/api/robots/navigation-progress"

        # Code robot (lấy từ env hoặc default)
        self.robot_code = os.environ.get('ROBOT_CODE', 'RB-01')
        self.headers = {'Content-Type': 'application/json'}
        self.max_retries = 3
        self.retry_delay = 2


class APIHandler:
    """🛰️ Handle REST API communication"""

    def __init__(self, config: APIConfig):
        self.config = config

    def send_status_to_api(self, status: str):
        """Gửi trạng thái robot lên API (không bao giờ crash)"""
        status_mapping = {
            'NAVIGATION_STARTED': 'transporting',
            'IN_PROGRESS': 'transporting',
            'ARRIVED_AT_TABLE': 'awaiting_handover',
            'RETURNING_HOME': 'returning_to_station',
            'ARRIVED_HOME': 'at_station',
            'NAVIGATION_COMPLETED': 'completed',
            'NAVIGATION_FAILED': 'needs_attention',
            'NAVIGATION_CANCELED': 'at_station',
            'TIMEOUT': 'needs_attention',
            'NAVIGATION_ERROR': 'needs_attention'
        }

        api_status = status_mapping.get(status, 'at_station')
        payload = {"code": self.config.robot_code, "status": api_status}

        try:
            res = requests.post(
                self.config.send_status_url,
                json=payload,
                headers=self.config.headers,
                timeout=5
            )

            if res.status_code != 200:
                logger.warning(
                    f"⚠️ API rejected status ({res.status_code}): {res.text}"
                )
                return

            logger.info(f"✅ Status sent → {api_status}")

        except Exception as e:
            logger.warning(f"⚠️ Cannot send status now → {e}")
            time.sleep(1)

    # ⭐ NEW: gửi % progress dạng text-only
    def send_progress_to_api(self, progress: float, point_name: str = None):
        """
        Gửi % progress dạng text đơn giản.
        Ví dụ text: "RB-01|37.5|Phòng 102"
        """
        text = f"{self.config.robot_code}|{progress:.1f}"
        if point_name:
            text += f"|{point_name}"

        payload = {"text": text}

        try:
            res = requests.post(
                self.config.send_progress_url,
                json=payload,
                headers=self.config.headers,
                timeout=5
            )

            if res.status_code != 200:
                logger.warning(
                    f"⚠️ API rejected progress ({res.status_code}): {res.text}"
                )
                return

            logger.info(f"📡 Progress text sent → {text}")

        except Exception as e:
            logger.warning(f"⚠️ Cannot send progress now → {e}")
            time.sleep(1)


# ============================================================
# 🤖 TABLE NAVIGATOR NODE
# ============================================================
class TableNavigator(Node):
    def __init__(self, api_handler: APIHandler = None):
        super().__init__('table_navigator')
        self.api_handler = api_handler

        # Nav2 commander
        self.navigator = BasicNavigator()
        self.navigator.initial_pose_received = True

        # Publisher trạng thái điều hướng
        self.status_publisher = self.create_publisher(
            String, '/robot_navigation_status', 10
        )
        # ⭐ Publisher % hoàn thành
        self.progress_publisher = self.create_publisher(
            String, '/robot_navigation_progress', 10
        )

        try:
            self.navigator.waitUntilNav2Active()
            self.get_logger().info("✅ Nav2 active and ready")
        except Exception as e:
            self.get_logger().warn(f"⚠️ Nav2 not fully active: {e}")

    # =========================
    # TẠO POSE
    # =========================
    def create_pose(self, x, y):
        pose = PoseStamped()
        pose.header.frame_id = 'map'
        pose.header.stamp = self.get_clock().now().to_msg()
        pose.pose.position.x = x
        pose.pose.position.y = y
        pose.pose.orientation.w = 1.0
        return pose

    # =========================
    # PUBLISH STATUS
    # =========================
    def publish_navigation_status(self, status, table_name=None):
        msg = String()
        msg.data = f"{status}|table:{table_name}" if table_name else status
        self.status_publisher.publish(msg)

        if self.api_handler:
            # Thread an toàn – không crash chương trình
            threading.Thread(
                target=lambda: self.safe_send(status),
                daemon=True
            ).start()

    def safe_send(self, status):
        try:
            self.api_handler.send_status_to_api(status)
        except Exception as e:
            logger.warning(f"⚠️ Safe send error: {e}")

    # =========================
    # PUBLISH PROGRESS (%)
    # =========================
    def publish_progress(self, percent: float, current_name: str = None):
        """
        percent: 0..100 (float)
        current_name: tên điểm hiện tại (nếu có)
        """
        # 1) Publish lên ROS topic
        msg = String()
        if current_name:
            msg.data = f"{percent:.1f}|point:{current_name}"
        else:
            msg.data = f"{percent:.1f}"
        self.progress_publisher.publish(msg)

        # 2) Gửi text lên API (nếu có handler)
        if self.api_handler:
            threading.Thread(
                target=lambda: self.safe_send_progress(percent, current_name),
                daemon=True
            ).start()

        # 3) Log
        self.get_logger().info(
            f"📊 Progress: {percent:.1f}% (at {current_name})"
        )

    def safe_send_progress(self, percent: float, point_name: str = None):
        try:
            self.api_handler.send_progress_to_api(percent, point_name)
        except Exception as e:
            logger.warning(f"⚠️ Safe send progress error: {e}")

    # =========================
    # PARSE ROUTE
    # =========================
    def parse_destination_route(self, route_data):
        """Nhận payload từ SignalR và chuyển thành danh sách PoseStamped"""
        waypoints, names = [], []
        try:
            destinations = route_data.get("destinations", [])
            if not destinations:
                self.get_logger().warn("⚠️ Route rỗng từ backend")
                return [], []

            self.get_logger().info(f"📍 Nhận route gồm {len(destinations)} điểm")
            for dest in destinations:
                try:
                    x, y = float(dest["x"]), float(dest["y"])
                    name = dest.get("name", f"Point_{dest.get('id', '?')}")
                    pose = self.create_pose(x, y)
                    waypoints.append(pose)
                    names.append(name)
                    self.get_logger().info(
                        f"✅ Added: {name} (x={x:.2f}, y={y:.2f})"
                    )
                except Exception as e:
                    self.get_logger().error(
                        f"❌ Invalid destination: {dest} ({e})"
                    )
        except Exception as e:
            self.get_logger().error(f"❌ Error parsing route: {e}")
        return waypoints, names

    # =========================
    # ĐI THEO ROUTE + TÍNH % HOÀN THÀNH
    # =========================
    def navigate_to_tables(self, positions_data):
        """
        positions_data: list dict {x, y, name}
        Tính % hoàn thành toàn route dựa trên:
          - index điểm (i)
          - feedback distance_remaining của Nav2
        """
        total = len(positions_data)
        if total == 0:
            self.get_logger().warn("⚠️ Không có điểm để di chuyển")
            return

        self.get_logger().info(f"🚀 Bắt đầu di chuyển qua {total} điểm")

        last_global_progress = -1.0  # để tránh spam

        for i, pos in enumerate(positions_data, 1):
            x, y, name = pos["x"], pos["y"], pos["name"]
            pose = self.create_pose(x, y)
            self.get_logger().info(
                f"🎯 Đi tới điểm {i}/{total}: {name} (x={x:.2f}, y={y:.2f})"
            )

            # Gửi goal
            self.navigator.goToPose(pose)
            time.sleep(0.5)

            initial_distance = None

            # Vòng lặp theo dõi tiến độ tới goal
            while not self.navigator.isTaskComplete():
                if shutdown_requested:
                    self.get_logger().warn(
                        "🛑 Shutdown requested, canceling nav2..."
                    )
                    self.navigator.cancelTask()
                    return

                # Lấy feedback để tính % tiến độ
                fb = self.navigator.getFeedback()
                if fb is not None:
                    dist_rem = getattr(fb, "distance_remaining", None)
                    if dist_rem is not None and dist_rem > 0.0:
                        if initial_distance is None:
                            initial_distance = dist_rem

                        if initial_distance and initial_distance > 0.0:
                            progress_goal = 1.0 - (dist_rem / initial_distance)
                            # Clamp
                            progress_goal = max(0.0, min(1.0, progress_goal))
                        else:
                            progress_goal = 0.0
                    else:
                        progress_goal = 0.0
                else:
                    progress_goal = 0.0

                # % toàn route = các điểm đã xong + tiến độ điểm hiện tại
                global_progress = ((i - 1) + progress_goal) / total * 100.0

                # Chỉ publish nếu thay đổi >= 1%
                if (
                    last_global_progress < 0
                    or abs(global_progress - last_global_progress) >= 1.0
                ):
                    self.publish_progress(global_progress, name)
                    last_global_progress = global_progress

                time.sleep(0.2)

            # Task đã complete, kiểm tra kết quả
            result = self.navigator.getResult()
            if result == TaskResult.SUCCEEDED:
                self.get_logger().info(f"✅ Arrived at {name}")
            elif result == TaskResult.CANCELED:
                self.get_logger().warn(f"⚠️ Canceled at {name}")
            else:
                self.get_logger().error(f"❌ Failed at {name}")

            # Sau mỗi điểm, đảm bảo % nhảy đúng vạch i/total
            global_progress = (i / total) * 100.0
            if abs(global_progress - last_global_progress) >= 0.5:
                self.publish_progress(global_progress, name)
                last_global_progress = global_progress

        # Kết thúc route, set 100% chắc chắn
        if last_global_progress < 99.9:
            self.publish_progress(100.0, "DONE")
        self.get_logger().info("🎉 Completed route navigation!")


# ============================================================
# 🔗 SIGNALR LISTENER
# ============================================================
class RouteListener:
    """📡 Lắng nghe route từ SignalR Hub và gọi TableNavigator"""

    def __init__(self, navigator: TableNavigator):
        self.navigator = navigator
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        threading.Thread(target=self.loop.run_forever, daemon=True).start()
        self.hub = None

    async def connect_hub(self):
        try:
            self.navigator.get_logger().info(f"🔌 Connecting to Hub: {HUB_URL}")
            self.hub = (
                HubConnectionBuilder()
                .with_url(HUB_URL)
                .with_automatic_reconnect(
                    {
                        "type": "raw",
                        "keep_alive_interval": 10,
                        "reconnect_interval": 5,
                    }
                )
                .build()
            )

            # ====================================================
            # 🎧 Nhận route từ backend
            # ====================================================
            def on_receive_destination_route(args):
                try:
                    data = args[0] if args else {}
                    print("\n📦 Received Destination Route:")
                    print(json.dumps(data, indent=2, ensure_ascii=False))
                    waypoints, names = self.navigator.parse_destination_route(data)
                    if waypoints:
                        pos_array = [
                            {
                                "x": w.pose.position.x,
                                "y": w.pose.position.y,
                                "name": n,
                            }
                            for w, n in zip(waypoints, names)
                        ]
                        self.navigator.navigate_to_tables(pos_array)
                    else:
                        self.navigator.get_logger().warn(
                            "⚠️ Không có waypoint hợp lệ."
                        )
                except Exception as e:
                    self.navigator.get_logger().error(
                        f"❌ Lỗi xử lý route: {e}"
                    )

            self.hub.on("ReceiveDestinationRoute", on_receive_destination_route)
            self.hub.on_open(lambda: print("✅ Connected to Hub"))
            self.hub.on_close(lambda: print("❌ Hub connection closed"))
            self.hub.on_error(lambda e: print(f"⚠️ Hub error: {e}"))
            self.hub.start()
            self.navigator.get_logger().info(
                "✅ SignalR listener đang lắng nghe route..."
            )
        except Exception as e:
            self.navigator.get_logger().error(
                f"❌ Không thể kết nối Hub: {e}"
            )

    def start(self):
        asyncio.run_coroutine_threadsafe(self.connect_hub(), self.loop)


# ============================================================
# 🧠 MAIN ENTRYPOINT
# ============================================================
def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    rclpy.init()

    api_handler = APIHandler(APIConfig())
    navigator = TableNavigator(api_handler=api_handler)
    listener = RouteListener(navigator)
    listener.start()

    print("=" * 60)
    print(f"📡 Listening for route updates from: {HUB_URL}")
    print("=" * 60)

    try:
        # SAFE SPIN LOOP — prevents crash from WaitSet errors
        while rclpy.ok() and not shutdown_requested:
            try:
                rclpy.spin_once(navigator, timeout_sec=0.1)
            except Exception as spin_err:
                print(f"⚠️ Spin error (ignored): {spin_err}")
                time.sleep(0.1)
                continue

    except KeyboardInterrupt:
        print("🛑 Received Ctrl+C — shutting down gracefully...")

    finally:
        print("🧹 Cleaning up resources...")

        # Stop SignalR cleanly
        if 'listener' in locals() and listener.hub is not None:
            try:
                listener.hub.stop()
            except Exception:
                pass

        # Destroy ROS node safely
        try:
            navigator.destroy_node()
        except Exception:
            pass

        # Shutdown ROS
        if rclpy.ok():
            try:
                rclpy.shutdown()
            except Exception:
                pass


if __name__ == "__main__":
    main()
