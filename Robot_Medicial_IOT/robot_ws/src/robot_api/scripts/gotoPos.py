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
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(message)s', datefmt='%H:%M:%S')
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
        self.send_status_url =  f"{BASE_URL}/api/robots/update-status"
        
        self.robot_code = os.environ.get('ROBOT_CODE', 'RB-01')
        self.headers = {'Content-Type': 'application/json'}
        self.max_retries = 3
        self.retry_delay = 2


class APIHandler:
    """🛰️ Handle REST API communication"""

    def __init__(self, config:APIConfig):
        self.config = config

    def send_status_to_api(self, status):
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
                logger.warning(f"⚠️ API rejected status ({res.status_code}): {res.text}")
                return

            logger.info(f"✅ Status sent → {api_status}")

        except Exception as e:
            logger.warning(f"⚠️ Cannot send status now → {e}")
            # Không retry ngay, tránh spam API & spam log
            time.sleep(1)

    
# ============================================================
# 🤖 TABLE NAVIGATOR NODE
# ============================================================
class TableNavigator(Node):
    def __init__(self, api_handler:APIHandler=None):
        super().__init__('table_navigator')
        self.api_handler = api_handler
        self.navigator = BasicNavigator()
        self.navigator.initial_pose_received = True
        self.status_publisher = self.create_publisher(String, '/robot_navigation_status', 10)

        try:
            self.navigator.waitUntilNav2Active()
            self.get_logger().info("✅ Nav2 active and ready")
        except Exception as e:
            self.get_logger().warn(f"⚠️ Nav2 not fully active: {e}")

    def create_pose(self, x, y):
        pose = PoseStamped()
        pose.header.frame_id = 'map'
        pose.header.stamp = self.get_clock().now().to_msg()
        pose.pose.position.x = x
        pose.pose.position.y = y
        pose.pose.orientation.w = 1.0
        return pose

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
                    self.get_logger().info(f"✅ Added: {name} (x={x:.2f}, y={y:.2f})")
                except Exception as e:
                    self.get_logger().error(f"❌ Invalid destination: {dest} ({e})")
        except Exception as e:
            self.get_logger().error(f"❌ Error parsing route: {e}")
        return waypoints, names

    def navigate_to_tables(self, positions_data):
        """Điều hướng qua danh sách các waypoint"""
        # self.publish_navigation_status("NAVIGATION_STARTED")
        total = len(positions_data)
        self.get_logger().info(f"🚀 Bắt đầu di chuyển qua {total} điểm")

        for i, pos in enumerate(positions_data, 1):
            x, y, name = pos["x"], pos["y"], pos["name"]
            pose = self.create_pose(x, y)
            # self.publish_navigation_status("IN_PROGRESS", name)
            self.get_logger().info(f"Go to position: {pose}")
            self.navigator.goToPose(pose)
            time.sleep(0.5)

            while not self.navigator.isTaskComplete():
                if shutdown_requested:
                    self.get_logger().warn("🛑 Shutdown requested, canceling nav2...")
                    self.navigator.cancelTask()
                    # self.publish_navigation_status("NAVIGATION_CANCELED", name)
                    return
                time.sleep(0.2)

            result = self.navigator.getResult()
            if result == TaskResult.SUCCEEDED:
                self.get_logger().info(f"✅ Arrived at {name}")
                # self.publish_navigation_status("ARRIVED_AT_TABLE", name)
            elif result == TaskResult.CANCELED:
                self.get_logger().warn(f"⚠️ Canceled at {name}")
            else:
                self.get_logger().error(f"❌ Failed at {name}")
                # self.publish_navigation_status("NAVIGATION_FAILED", name)

        # self.publish_navigation_status("NAVIGATION_COMPLETED")
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
                .with_automatic_reconnect({
                    "type": "raw",
                    "keep_alive_interval": 10,
                    "reconnect_interval": 5
                })
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
                        pos_array = [{"x": w.pose.position.x, "y": w.pose.position.y, "name": n}
                                     for w, n in zip(waypoints, names)]
                        self.navigator.navigate_to_tables(pos_array)
                    else:
                        self.navigator.get_logger().warn("⚠️ Không có waypoint hợp lệ.")
                except Exception as e:
                    self.navigator.get_logger().error(f"❌ Lỗi xử lý route: {e}")

            self.hub.on("ReceiveDestinationRoute", on_receive_destination_route)
            self.hub.on_open(lambda: print("✅ Connected to Hub"))
            self.hub.on_close(lambda: print("❌ Hub connection closed"))
            self.hub.on_error(lambda e: print(f"⚠️ Hub error: {e}"))
            self.hub.start()
            self.navigator.get_logger().info("✅ SignalR listener đang lắng nghe route...")
        except Exception as e:
            self.navigator.get_logger().error(f"❌ Không thể kết nối Hub: {e}")

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
        except:
            pass

        # Shutdown ROS
        if rclpy.ok():
            try:
                rclpy.shutdown()
            except:
                pass
if __name__ == "__main__":
    main()
