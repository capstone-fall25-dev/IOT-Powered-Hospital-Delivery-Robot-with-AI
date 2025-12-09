#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseStamped
from nav2_simple_commander.robot_navigator import BasicNavigator, TaskResult
from std_msgs.msg import String
import time, json, os, sys, signal, requests, logging, asyncio, threading
from signalrcore.hub_connection_builder import HubConnectionBuilder
from concurrent.futures import ThreadPoolExecutor
from rclpy.duration import Duration


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
        self.send_status_url = f"{BASE_URL}/api/robots/update-status"
        self.send_progress_url = f"{BASE_URL}/api/RobotMode/navigation-progress"
        self.robot_code = os.environ.get('ROBOT_CODE', 'RBT001')
        self.headers = {'Content-Type': 'application/json'}
        
        # ⭐ Throttling config
        self.progress_interval = 2.0  # Gửi mỗi 2 giây
        self.progress_threshold = 3.0  # Hoặc khi thay đổi >= 3%
        self.status_retry_max = 3
        self.status_retry_delay = 2


class APIHandler:
    """🛰️ Handle REST API communication with throttling & async"""

    def __init__(self, config: APIConfig):
        self.config = config
        
        # ⭐ Throttling state
        self.last_progress_time = 0
        self.last_progress_value = -1
        
        # ⭐ Thread pool cho async calls
        self.executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="API")
        self._shutdown = False

    def shutdown(self):
        """Cleanup resources"""
        self._shutdown = True
        self.executor.shutdown(wait=True, cancel_futures=True)
        logger.info("🧹 APIHandler executor closed")

    # ============================================================
    # STATUS UPDATE (synchronous - quan trọng)
    # ============================================================
    def send_status_to_api(self, status: str):
        """Gửi trạng thái robot lên API (synchronous với retry)"""
        if self._shutdown:
            return
            
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

        # ⭐ Retry logic cho status (quan trọng)
        for attempt in range(1, self.config.status_retry_max + 1):
            try:
                res = requests.post(
                    self.config.send_status_url,
                    json=payload,
                    headers=self.config.headers,
                    timeout=5
                )

                if res.status_code == 200:
                    logger.info(f"✅ Status sent → {api_status}")
                    return
                else:
                    logger.warning(
                        f"⚠️ API rejected status ({res.status_code}): {res.text}"
                    )
                    
            except Exception as e:
                if attempt < self.config.status_retry_max:
                    logger.warning(
                        f"⚠️ Status send failed (attempt {attempt}/{self.config.status_retry_max}), retrying..."
                    )
                    time.sleep(self.config.status_retry_delay)
                else:
                    logger.error(f"❌ Status send failed after {attempt} attempts: {e}")

    # ============================================================
    # PROGRESS UPDATE (async - không quan trọng bằng)
    # ============================================================
    def send_progress_to_api(self, progress: float, point_name: str = None):
        """
        ⭐ Gửi % progress async với throttling
        - Chỉ gửi mỗi X giây HOẶC khi thay đổi đáng kể
        - Không block navigation loop
        """
        if self._shutdown:
            return
            
        current_time = time.time()
        
        # ⭐ THROTTLING: Kiểm tra thời gian và threshold thay đổi
        time_elapsed = current_time - self.last_progress_time
        progress_change = abs(progress - self.last_progress_value)
        
        if (time_elapsed < self.config.progress_interval and 
            progress_change < self.config.progress_threshold):
            return  # Bỏ qua request này
        
        # ⭐ Gửi async qua thread pool
        self.executor.submit(
            self._send_progress_internal, 
            progress, 
            point_name,
            current_time
        )

    def _send_progress_internal(self, progress: float, point_name: str, timestamp: float):
        """Internal method để gửi progress (chạy trong thread pool)"""
        if self._shutdown:
            return
            
        text = f"{self.config.robot_code}|{progress:.1f}"
        if point_name:
            text += f"|{point_name}"

        payload = {"text": text}

        # ⭐ Light retry (chỉ 2 lần, timeout ngắn)
        for attempt in range(2):
            try:
                res = requests.post(
                    self.config.send_progress_url,
                    json=payload,
                    headers=self.config.headers,
                    timeout=3  # Timeout ngắn hơn
                )

                if res.status_code == 200:
                    # ⭐ Update throttling state
                    self.last_progress_time = timestamp
                    self.last_progress_value = progress
                    
                    logger.info(f"📡 Progress: {progress:.1f}% {f'→ {point_name}' if point_name else ''}")
                    return
                    
            except Exception as e:
                if attempt == 0:
                    time.sleep(0.5)  # Retry sau 0.5s
                else:
                    logger.debug(f"Progress update skipped: {e}")


# ============================================================
# 🤖 TABLE NAVIGATOR NODE
# ============================================================
class TableNavigator(Node):
    def __init__(self, api_handler: APIHandler = None):
        super().__init__('table_navigator')
        self.navigator = BasicNavigator()
        self.api_handler = api_handler
        
        # ⭐ Navigation timeout config
        self.navigation_timeout = 600.0  # 10 phút
        
        try:
            self.navigator.waitUntilNav2Active()
            self.get_logger().info("✅ Nav2 active and ready")
        except Exception as e:
            self.get_logger().warn(f"⚠️ Nav2 not fully active: {e}")

    def wait_for_nav2_ready(self, max_retries=15, timeout_per_try=2.0):
        """
        ⭐ Chờ Nav2 sẵn sàng với retry logic
        """
        self.get_logger().info("⏳ Checking if Nav2 is ready...")
        
        for attempt in range(1, max_retries + 1):
            try:
                self.navigator.waitUntilNav2Active(timeout=timeout_per_try)
                self.get_logger().info("✅ Nav2 ready for navigation!")
                return True
                
            except Exception as e:
                self.get_logger().warn(
                    f"⏳ Nav2 not ready yet... (attempt {attempt}/{max_retries})"
                )
                time.sleep(1)
        
        self.get_logger().error("❌ Nav2 failed to become ready!")
        return False

    def parse_destination_route(self, data):
        """Parse route data từ SignalR"""
        waypoints = []
        names = []
        
        try:
            points = data.get("destinationCoordinates", [])
            
            for idx, point in enumerate(points):
                x = point.get("x")
                y = point.get("y")
                name = point.get("name", f"Point_{idx+1}")
                
                if x is None or y is None:
                    continue
                
                pose = PoseStamped()
                pose.header.frame_id = 'map'
                pose.header.stamp = self.navigator.get_clock().now().to_msg()
                pose.pose.position.x = float(x)
                pose.pose.position.y = float(y)
                pose.pose.position.z = 0.0
                pose.pose.orientation.w = 1.0
                
                waypoints.append(pose)
                names.append(name)
            
            return waypoints, names
            
        except Exception as e:
            self.get_logger().error(f"❌ Parse error: {e}")
            return [], []

    # ============================================================
    # ⭐ MAIN NAVIGATION METHOD (với progress tracking)
    # ============================================================
    def navigate_to_tables(self, pos_array):
        """
        ⭐ Navigate với real-time progress tracking
        """
        if not pos_array:
            self.get_logger().warn("⚠️ Empty waypoint list")
            return

        self.get_logger().info(f"🚀 Starting navigation to {len(pos_array)} waypoints")
        
        # Send status: bắt đầu
        if self.api_handler:
            self.api_handler.send_status_to_api('NAVIGATION_STARTED')

        # Chuẩn bị waypoints
        waypoints = []
        names = []
        
        for idx, pos in enumerate(pos_array):
            pose = PoseStamped()
            pose.header.frame_id = 'map'
            pose.header.stamp = self.navigator.get_clock().now().to_msg()
            pose.pose.position.x = pos['x']
            pose.pose.position.y = pos['y']
            pose.pose.position.z = 0.0
            pose.pose.orientation.w = 1.0
            
            waypoints.append(pose)
            names.append(pos.get('name', f'Waypoint_{idx+1}'))

        total_waypoints = len(waypoints)
        
        # Bắt đầu navigation
        nav_start = self.navigator.get_clock().now()
        self.navigator.followWaypoints(waypoints)
        
        self.get_logger().info(f"📍 Following {total_waypoints} waypoints...")
        if self.api_handler:
            self.api_handler.send_status_to_api('IN_PROGRESS')

        # ============================================================
        # ⭐ VÒNG LẶP TRACKING PROGRESS
        # ============================================================
        last_waypoint_idx = -1
        
        while not self.navigator.isTaskComplete():
            # ⭐ Lấy feedback từ Nav2
            feedback = self.navigator.getFeedback()
            
            if feedback:
                current_wp_idx = feedback.current_waypoint
                
                # ⭐ Tính % progress
                # Formula: (current + 1) / total * 100
                # Ví dụ: waypoint 0/3 → 33%, waypoint 1/3 → 66%, waypoint 2/3 → 100%
                progress = ((current_wp_idx + 1) / total_waypoints) * 100.0
                point_name = names[current_wp_idx] if current_wp_idx < len(names) else None
                
                # ⭐ Gửi progress lên API (throttled)
                if self.api_handler:
                    self.api_handler.send_progress_to_api(progress, point_name)
                
                # Log khi đổi waypoint
                if current_wp_idx != last_waypoint_idx:
                    self.get_logger().info(
                        f"📍 Waypoint {current_wp_idx + 1}/{total_waypoints}: {point_name}"
                    )
                    last_waypoint_idx = current_wp_idx

            # ⭐ Kiểm tra timeout
            now = self.navigator.get_clock().now()
            if (now - nav_start) > Duration(seconds=self.navigation_timeout):
                self.get_logger().error(
                    f"⏰ Navigation timeout ({self.navigation_timeout}s)"
                )
                self.navigator.cancelTask()
                
                if self.api_handler:
                    self.api_handler.send_status_to_api('TIMEOUT')
                return

            # ⭐ Kiểm tra shutdown signal
            if shutdown_requested:
                self.get_logger().warn("🛑 Shutdown requested, canceling navigation")
                self.navigator.cancelTask()
                return

            time.sleep(0.1)  # Tránh busy loop

        # ============================================================
        # ⭐ XỬ LÝ KẾT QUẢ
        # ============================================================
        result = self.navigator.getResult()
        
        if result == TaskResult.SUCCEEDED:
            self.get_logger().info("🎉 Navigation completed successfully!")
            
            # ⭐ Gửi progress 100%
            if self.api_handler:
                self.api_handler.send_progress_to_api(100.0, "Completed")
                self.api_handler.send_status_to_api('NAVIGATION_COMPLETED')
                
        elif result == TaskResult.CANCELED:
            self.get_logger().warn("🛑 Navigation was canceled")
            if self.api_handler:
                self.api_handler.send_status_to_api('NAVIGATION_CANCELED')
                
        elif result == TaskResult.FAILED:
            self.get_logger().error("❌ Navigation failed")
            if self.api_handler:
                self.api_handler.send_status_to_api('NAVIGATION_FAILED')
        else:
            self.get_logger().warn(f"⚠️ Unknown result: {result}")
            if self.api_handler:
                self.api_handler.send_status_to_api('NAVIGATION_ERROR')


# ============================================================
# 🔗 SIGNALR LISTENER
# ============================================================
class RouteListener:
    """📡 Lắng nghe route từ SignalR Hub"""

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

            # ⭐ Callback nhận route
            def on_receive_destination_route(args):
                try:
                    data = args[0] if args else {}
                    print("\n📦 Received Destination Route:")
                    print(json.dumps(data, indent=2, ensure_ascii=False))
                    
                    # ⭐ Chờ Nav2 sẵn sàng
                    if not self.navigator.wait_for_nav2_ready():
                        self.navigator.get_logger().error(
                            "❌ Cannot navigate - Nav2 not ready!"
                        )
                        return
                    
                    # Parse và navigate
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

    def stop(self):
        """Cleanup SignalR connection"""
        if self.hub:
            try:
                self.hub.stop()
                logger.info("🧹 SignalR hub closed")
            except Exception as e:
                logger.warning(f"⚠️ Error closing hub: {e}")


# ============================================================
# 🧠 MAIN ENTRYPOINT
# ============================================================
def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    rclpy.init()

    api_config = APIConfig()
    api_handler = APIHandler(api_config)
    navigator = TableNavigator(api_handler=api_handler)
    listener = RouteListener(navigator)
    
    listener.start()

    print("=" * 60)
    print(f"📡 Listening for route updates from: {HUB_URL}")
    print(f"🤖 Robot Code: {api_config.robot_code}")
    print(f"⏱️  Progress throttle: {api_config.progress_interval}s or {api_config.progress_threshold}% change")
    print("=" * 60)

    try:
        # ⭐ SAFE SPIN LOOP
        while rclpy.ok() and not shutdown_requested:
            try:
                rclpy.spin_once(navigator, timeout_sec=0.1)
            except Exception as spin_err:
                logger.debug(f"Spin error (ignored): {spin_err}")
                time.sleep(0.1)
                continue

    except KeyboardInterrupt:
        print("🛑 Received Ctrl+C — shutting down gracefully...")

    finally:
        print("🧹 Cleaning up resources...")

        # ⭐ Stop SignalR
        listener.stop()

        # ⭐ Shutdown API handler (đợi pending requests)
        api_handler.shutdown()

        # ⭐ Destroy ROS node
        try:
            navigator.destroy_node()
        except Exception:
            pass

        # ⭐ Shutdown ROS
        if rclpy.ok():
            try:
                rclpy.shutdown()
            except Exception:
                pass

        print("✅ Shutdown complete!")


if __name__ == "__main__":
    main()
