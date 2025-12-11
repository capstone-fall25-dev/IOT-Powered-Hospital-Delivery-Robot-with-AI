#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseStamped
from nav2_simple_commander.robot_navigator import BasicNavigator, TaskResult
from std_msgs.msg import String
import time, json, os, signal, requests, logging, asyncio, threading, math
from signalrcore.hub_connection_builder import HubConnectionBuilder
from concurrent.futures import ThreadPoolExecutor
from rclpy.duration import Duration
from tf2_ros import Buffer, TransformListener
import rclpy.time
from rclpy.executors import MultiThreadedExecutor


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
        
        self.progress_interval = 2.0
        self.progress_threshold = 3.0
        self.status_retry_max = 3
        self.status_retry_delay = 2


class APIHandler:
    """🛰️ Handle REST API communication"""

    def __init__(self, config: APIConfig):
        self.config = config
        self.last_progress_time = 0
        self.last_progress_value = -1
        self.executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="API")
        self._shutdown = False

    def shutdown(self):
        self._shutdown = True
        self.executor.shutdown(wait=True, cancel_futures=True)
        logger.info("🧹 APIHandler executor closed")

    def send_status_to_api(self, status: str):
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
                    logger.warning(f"⚠️ API rejected status ({res.status_code})")
                    
            except Exception as e:
                if attempt < self.config.status_retry_max:
                    logger.warning(
                        f"⚠️ Status send failed (attempt "
                        f"{attempt}/{self.config.status_retry_max})"
                    )
                    time.sleep(self.config.status_retry_delay)
                else:
                    logger.error(f"❌ Status send failed: {e}")

    def send_progress_to_api(self, progress: float, point_name: str = None):
        if self._shutdown:
            return
            
        current_time = time.time()
        time_elapsed = current_time - self.last_progress_time
        progress_change = abs(progress - self.last_progress_value)
        
        if (time_elapsed < self.config.progress_interval and 
            progress_change < self.config.progress_threshold):
            return
        
        self.executor.submit(
            self._send_progress_internal, 
            progress, 
            point_name,
            current_time
        )

    def _send_progress_internal(self, progress: float, point_name: str, timestamp: float):
        if self._shutdown:
            return
            
        text = f"{self.config.robot_code}|{progress:.1f}"
        if point_name:
            text += f"|{point_name}"

        payload = {"text": text}

        for attempt in range(2):
            try:
                res = requests.post(
                    self.config.send_progress_url,
                    json=payload,
                    headers=self.config.headers,
                    timeout=3
                )

                if res.status_code == 200:
                    self.last_progress_time = timestamp
                    self.last_progress_value = progress
                    logger.info(
                        f"📡 Progress: {progress:.1f}% "
                        f"{f'→ {point_name}' if point_name else ''}"
                    )
                    return
                    
            except Exception as e:
                if attempt == 0:
                    time.sleep(0.5)
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
        self.navigation_timeout = 3600.0
        
        self.tf_buffer = Buffer()
        self.tf_listener = TransformListener(self.tf_buffer, self)

    def get_robot_position(self):
        try:
            transform = self.tf_buffer.lookup_transform(
                'map',
                'base_link',
                rclpy.time.Time(),
                timeout=Duration(seconds=1.0)
            )
            x = transform.transform.translation.x
            y = transform.transform.translation.y
            return (x, y)
        except Exception as e:
            self.get_logger().warn(f"⚠️ Cannot get robot position: {e}")
            return None

    def calculate_distance(self, x1, y1, x2, y2):
        return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)

    def wait_for_map_frame(self, timeout=15.0):
        self.get_logger().info("⏳ Waiting for map frame to be available...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                transform = self.tf_buffer.lookup_transform(
                    'map',
                    'base_link',
                    rclpy.time.Time(),
                    timeout=Duration(seconds=1.0)
                )
                self.get_logger().info("✅ Map frame is available!")
                self.get_logger().info(
                    f"📍 Robot position: x={transform.transform.translation.x:.2f}, "
                    f"y={transform.transform.translation.y:.2f}"
                )
                return True
            except Exception:
                self.get_logger().warn(
                    f"⏳ Waiting for map frame... "
                    f"({int(time.time() - start_time)}s/{int(timeout)}s)"
                )
                time.sleep(1)
        
        self.get_logger().error("❌ Map frame not available after timeout!")
        return False

    def set_initial_pose(self, x=0.0, y=0.0, yaw=0.0):
        self.get_logger().info("📍 Publishing Initial Pose")
        initial_pose = PoseStamped()
        initial_pose.header.frame_id = 'map'
        initial_pose.header.stamp = self.navigator.get_clock().now().to_msg()
        initial_pose.pose.position.x = x
        initial_pose.pose.position.y = y
        initial_pose.pose.position.z = 0.0
        
        initial_pose.pose.orientation.x = 0.0
        initial_pose.pose.orientation.y = 0.0
        initial_pose.pose.orientation.z = math.sin(yaw / 2.0)
        initial_pose.pose.orientation.w = math.cos(yaw / 2.0)
        
        self.navigator.setInitialPose(initial_pose)
        self.get_logger().info(
            f"✅ Initial pose set at ({x:.2f}, {y:.2f}, yaw={yaw:.2f})"
        )
        
        self.get_logger().info("⏳ Waiting for AMCL to localize (8 seconds)...")
        time.sleep(8)
        
        if not self.wait_for_map_frame(timeout=10.0):
            self.get_logger().error(
                "⚠️ Map frame still not available, but continuing..."
            )
        else:
            self.get_logger().info("✅ AMCL localization successful!")

    def wait_for_nav2_ready(self, max_retries=10, timeout_per_try=1.0):
        self.get_logger().info("⏳ Waiting for Nav2 to become ready...")
        
        for attempt in range(1, max_retries + 1):
            try:
                self.navigator.waitUntilNav2Active(timeout=timeout_per_try)
                self.get_logger().info("✅ Nav2 is ready for navigation!")
                return True
            except Exception:
                if attempt >= max_retries:
                    self.get_logger().warn(
                        f"⚠️ Nav2 timeout after {max_retries}s. Checking nodes..."
                    )
                    import subprocess
                    try:
                        result = subprocess.run(
                            ["ros2", "node", "list"],
                            capture_output=True,
                            text=True,
                            timeout=2
                        )
                        nodes = result.stdout
                        required_nodes = ['amcl', 'bt_navigator', 'controller', 'planner']
                        found_nodes = [n for n in required_nodes if n in nodes]
                        
                        if len(found_nodes) >= 2:
                            self.get_logger().warn(
                                f"⚠️ Found {len(found_nodes)}/4 Nav2 nodes. "
                                f"Proceeding anyway..."
                            )
                            return True
                        else:
                            self.get_logger().error(
                                f"❌ Only {len(found_nodes)}/4 Nav2 nodes running"
                            )
                            return False
                    except Exception as check_err:
                        self.get_logger().error(f"❌ Cannot check nodes: {check_err}")
                        return False
                    
                self.get_logger().warn(
                    f"⏳ Nav2 not ready yet... (attempt {attempt}/{max_retries})"
                )
                time.sleep(0.5)
        
        return False

    def parse_destination_route(self, data):
        waypoints = []
        names = []
        
        try:
            points = (
                data.get("destinationCoordinates") or 
                data.get("destinations") or 
                data.get("Destinations") or
                []
            )
            
            if not points:
                self.get_logger().error("❌ No destination points found in data!")
                self.get_logger().error(f"Available keys: {list(data.keys())}")
                return [], []
            
            self.get_logger().info(f"📍 Found {len(points)} destination point(s)")
            
            for idx, point in enumerate(points):
                # ✅ FIX: Dùng 'in' operator thay vì 'or' để tránh falsy với 0.0
                x = None
                if "x" in point:
                    x = point["x"]
                elif "X" in point:
                    x = point["X"]
                elif "longitude" in point:
                    x = point["longitude"]
                elif "Longitude" in point:
                    x = point["Longitude"]
                
                y = None
                if "y" in point:
                    y = point["y"]
                elif "Y" in point:
                    y = point["Y"]
                elif "latitude" in point:
                    y = point["latitude"]
                elif "Latitude" in point:
                    y = point["Latitude"]
                
                name = (
                    point.get("name") or 
                    point.get("Name") or 
                    f"Point_{idx+1}"
                )
                
                self.get_logger().info(
                    f"  Point {idx+1}: x={x}, y={y}, name={name}"
                )
                
                if x is None or y is None:
                    self.get_logger().warn(
                        f"⚠️ Point {idx+1} ({name}) missing x or y coordinate, skipping"
                    )
                    continue
                
                try:
                    x_float = float(x)
                    y_float = float(y)
                except (ValueError, TypeError):
                    self.get_logger().error(
                        f"❌ Invalid coordinate format for {name}: x={x}, y={y}"
                    )
                    continue
                
                pose = PoseStamped()
                pose.header.frame_id = 'map'
                pose.header.stamp = self.navigator.get_clock().now().to_msg()
                pose.pose.position.x = x_float
                pose.pose.position.y = y_float
                pose.pose.position.z = 0.0
                pose.pose.orientation.w = 1.0
                
                waypoints.append(pose)
                names.append(name)
            
            if waypoints:
                self.get_logger().info(
                    f"✅ Successfully parsed {len(waypoints)} valid waypoint(s)"
                )
            else:
                self.get_logger().error("❌ No valid waypoints after parsing")
            
            return waypoints, names
            
        except Exception as e:
            self.get_logger().error(f"❌ Parse error: {e}")
            import traceback
            self.get_logger().error(f"Stack trace:\n{traceback.format_exc()}")
            return [], []

    def navigate_to_tables(self, pos_array, skip_nav2_check=False):
        if not pos_array:
            self.get_logger().warn("⚠️ Empty waypoint list")
            return

        self.get_logger().info(f"🚀 Starting navigation to {len(pos_array)} waypoints")
        
        if self.api_handler:
            self.api_handler.send_status_to_api('NAVIGATION_STARTED')

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
        
        try:
            nav_start = self.navigator.get_clock().now()
            self.navigator.followWaypoints(waypoints)
        except Exception as e:
            self.get_logger().error(f"❌ Failed to start navigation: {e}")
            if self.api_handler:
                self.api_handler.send_status_to_api('NAVIGATION_ERROR')
            return
        
        self.get_logger().info(f"📍 Following {total_waypoints} waypoints...")
        if self.api_handler:
            self.api_handler.send_status_to_api('IN_PROGRESS')

        initial_distances = {}
        last_progress_log_time = time.time()

        while not self.navigator.isTaskComplete():
            feedback = self.navigator.getFeedback()
            
            if feedback:
                current_wp_idx = feedback.current_waypoint
                if current_wp_idx >= len(pos_array):
                    current_wp_idx = len(pos_array) - 1
                point_name = names[current_wp_idx] if current_wp_idx < len(names) else None
                
                robot_pos = self.get_robot_position()
                
                if robot_pos:
                    robot_x, robot_y = robot_pos
                    goal_x = pos_array[current_wp_idx]['x']
                    goal_y = pos_array[current_wp_idx]['y']
                    
                    distance_remaining = self.calculate_distance(
                        robot_x, robot_y, goal_x, goal_y
                    )
                    
                    if current_wp_idx not in initial_distances:
                        initial_distances[current_wp_idx] = max(distance_remaining, 0.01)
                        self.get_logger().info(
                            f"📏 Waypoint {current_wp_idx + 1}/{total_waypoints} "
                            f"({point_name}) initial distance: {distance_remaining:.2f}m"
                        )
                    
                    initial_dist = initial_distances.get(current_wp_idx, 1.0)
                    
                    if initial_dist > 0.01:
                        waypoint_progress = max(
                            0,
                            min(100, (1 - distance_remaining / initial_dist) * 100)
                        )
                    else:
                        waypoint_progress = 100.0
                    
                    completed_waypoints = current_wp_idx
                    total_progress = (
                        (completed_waypoints / total_waypoints) * 100 +
                        (waypoint_progress / total_waypoints)
                    )
                    
                    total_progress = min(99.9, total_progress)
                    
                    if self.api_handler:
                        self.api_handler.send_progress_to_api(
                            total_progress, point_name
                        )
                    
                    if time.time() - last_progress_log_time >= 3.0:
                        self.get_logger().info(
                            f"📊 Progress: {total_progress:.1f}% | "
                            f"Waypoint {current_wp_idx + 1}/{total_waypoints}: "
                            f"{point_name} | "
                            f"Distance: {distance_remaining:.2f}m/"
                            f"{initial_dist:.2f}m"
                        )
                        last_progress_log_time = time.time()

            now = self.navigator.get_clock().now()
            if (now - nav_start) > Duration(seconds=self.navigation_timeout):
                self.get_logger().error(
                    f"⏰ Navigation timeout ({self.navigation_timeout}s)"
                )
                self.navigator.cancelTask()
                
                if self.api_handler:
                    self.api_handler.send_status_to_api('TIMEOUT')
                return

            if shutdown_requested:
                self.get_logger().warn("🛑 Shutdown requested, canceling navigation")
                self.navigator.cancelTask()
                return

            time.sleep(0.1)

        result = self.navigator.getResult()
        
        if result == TaskResult.SUCCEEDED:
            self.get_logger().info("🎉 Navigation completed successfully!")
            
            # ✅ Kiểm tra nếu điểm cuối là Station
            last_waypoint = pos_array[-1]
            if last_waypoint.get('name', '').lower() in ['station', 'home', 'charging']:
                if self.api_handler:
                    self.api_handler.send_progress_to_api(100.0, "Về trạm hoàn tất")
                    self.api_handler.send_status_to_api('ARRIVED_HOME')
                    self.get_logger().info("🏠 Robot đã về đến trạm!")
            else:
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

            def on_receive_destination_route(args):
                threading.Thread(
                    target=self._process_route_sync,
                    args=(args,),
                    daemon=True
                ).start()

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

    def _process_route_sync(self, args):
        try:
            data = args[0] if args else {}
            
            print("\n" + "="*60)
            print("📦 Received Destination Route:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            print("="*60 + "\n")
            
            if not data:
                self.navigator.get_logger().error("❌ Received empty data!")
                return

            # ====== CHỈ RESET MAP KHI CÓ FLAG ======
            reset_map = bool(
                data.get("resetMap") or data.get("isModelRunMap") or False
            )

            if reset_map:
                initial_x = float(data.get("initialPoseX", 0.0))
                initial_y = float(data.get("initialPoseY", 0.0))
                initial_yaw = float(data.get("initialPoseYaw", 0.0))

                self.navigator.get_logger().info(
                    f"🗺️ Reset map & set initial pose: "
                    f"({initial_x}, {initial_y}, yaw={initial_yaw})"
                )
                self.navigator.set_initial_pose(initial_x, initial_y, initial_yaw)

                if not self.navigator.wait_for_nav2_ready():
                    self.navigator.get_logger().warn(
                        "⚠️ Nav2 check failed but proceeding anyway..."
                    )
            else:
                self.navigator.get_logger().info(
                    "➡️ Received waypoints only, keep current robot pose (NO map reset)"
                )

            waypoints, names = self.navigator.parse_destination_route(data)
            
            if not waypoints or len(waypoints) == 0:
                self.navigator.get_logger().error(
                    "❌ Failed to parse waypoints from data!"
                )
                return
            
            pos_array = [
                {
                    "x": w.pose.position.x,
                    "y": w.pose.position.y,
                    "name": n,
                }
                for w, n in zip(waypoints, names)
            ]
            
            self.navigator.navigate_to_tables(pos_array, skip_nav2_check=True)
            
        except Exception as e:
            import traceback
            self.navigator.get_logger().error(f"❌ Error processing route: {e}")
            self.navigator.get_logger().error(
                f"Stack trace:\n{traceback.format_exc()}"
            )

    def start(self):
        asyncio.run_coroutine_threadsafe(self.connect_hub(), self.loop)

    def stop(self):
        if self.hub:
            try:
                self.hub.stop()
                logger.info("🧹 SignalR hub closed")
            except Exception as e:
                logger.warning(f"⚠️ Error closing hub: {e}")


# ============================================================
# 🧠 MAIN ENTRYPOINT (MultiThreadedExecutor)
# ============================================================
def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    rclpy.init()

    api_config = APIConfig()
    api_handler = APIHandler(api_config)
    navigator = TableNavigator(api_handler=api_handler)
    listener = RouteListener(navigator)
    
    executor = MultiThreadedExecutor(num_threads=4)
    executor.add_node(navigator)
    
    listener.start()

    print("=" * 60)
    print(f"📡 Listening for route updates from: {HUB_URL}")
    print(f"🤖 Robot Code: {api_config.robot_code}")
    print(f"📍 Initial pose: (0, 0) by default")
    print(f"⏱️  AMCL localization wait: 8 seconds")
    print(f"⏱️  Map frame check timeout: 10 seconds")
    print(f"⏱️  Nav2 wait timeout: 10 seconds with fallback")
    print(f"🗺️  Supported keys: destinationCoordinates, destinations")
    print(f"📊 Progress calculation: TF-based distance tracking")
    print(f"🏠 Return to station: name=Station at (0, 0)")
    print("=" * 60)

    spin_thread = threading.Thread(target=executor.spin, daemon=True)
    spin_thread.start()

    try:
        while rclpy.ok() and not shutdown_requested:
            time.sleep(0.1)

    except KeyboardInterrupt:
        print("🛑 Received Ctrl+C — shutting down gracefully...")

    finally:
        print("🧹 Cleaning up resources...")

        listener.stop()
        api_handler.shutdown()

        try:
            executor.shutdown()
        except Exception:
            pass

        try:
            navigator.destroy_node()
        except Exception:
            pass

        if rclpy.ok():
            try:
                rclpy.shutdown()
            except Exception:
                pass

        print("✅ Shutdown complete!")


if __name__ == "__main__":
    main()
