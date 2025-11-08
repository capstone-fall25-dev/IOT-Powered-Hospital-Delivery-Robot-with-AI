#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseStamped
from nav2_simple_commander.robot_navigator import BasicNavigator, TaskResult
from std_msgs.msg import String
import time
import sys
import json
import os
import signal
import requests
from threading import Thread
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

shutdown_requested = False

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    global shutdown_requested
    print(f"\n🛑 Received signal {signum}, shutting down gracefully...")
    shutdown_requested = True


class APIConfig:
    """Configuration for API endpoints"""
    def __init__(self):
        # API để lấy vị trí cần di chuyển
        self.get_positions_url = os.environ.get('GET_POSITIONS_API', 'http://localhost:5170/api/destinations/{id}/position')
        
        # API để gửi trạng thái robot
        self.send_status_url = os.environ.get('SEND_STATUS_API', 'http://localhost:5170/api/robots/update-status')
        
        # Robot code
        self.robot_code = os.environ.get('ROBOT_CODE', 'RB-01')
        
        # API headers
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': os.environ.get('API_TOKEN', '')  # Thêm token nếu cần
        }
        
        # Retry settings
        self.max_retries = 3
        self.retry_delay = 2  # seconds


class APIHandler:
    """Handle API communication"""
    def __init__(self, config: APIConfig):
        self.config = config
        
    def get_position_from_api(self, destination_id):
        """
        Lấy vị trí từ API theo destination ID
        
        API: GET http://localhost:5170/api/destinations/{id}/position
        Response format:
        {
            "id": 2,
            "name": "Phòng Nội trú 101",
            "x": 10.36,
            "y": 105.49,
            "area": "Tầng 1",
            "floor": "1"
        }
        """
        url = self.config.get_positions_url.replace('{id}', str(destination_id))
        
        for attempt in range(self.config.max_retries):
            try:
                logger.info(f'📡 Fetching position for destination {destination_id} (attempt {attempt + 1}/{self.config.max_retries})...')
                
                response = requests.get(
                    url,
                    headers=self.config.headers,
                    timeout=10
                )
                
                response.raise_for_status()
                data = response.json()
                
                # Validate response
                if 'x' in data and 'y' in data:
                    position = {
                        'id': data.get('id'),
                        'name': data.get('name', f'Destination_{destination_id}'),
                        'x': float(data['x']),
                        'y': float(data['y']),
                        'area': data.get('area'),
                        'floor': data.get('floor')
                    }
                    
                    logger.info(f'✅ Received position: {position["name"]} at x={position["x"]:.2f}, y={position["y"]:.2f}')
                    
                    return {
                        'position': position,
                        'success': True
                    }
                else:
                    logger.error(f'❌ Invalid API response format: {data}')
                    
            except requests.exceptions.RequestException as e:
                logger.error(f'❌ API request failed (attempt {attempt + 1}): {e}')
                
                if attempt < self.config.max_retries - 1:
                    logger.info(f'⏳ Retrying in {self.config.retry_delay} seconds...')
                    time.sleep(self.config.retry_delay)
                    
        return {'success': False, 'error': f'Failed to fetch position for destination {destination_id}'}
    
    def get_multiple_positions(self, destination_ids):
        """
        Lấy nhiều vị trí từ API
        
        Args:
            destination_ids: List of destination IDs [1, 2, 3]
            
        Returns:
            {
                'success': True,
                'positions': [
                    {'id': 1, 'name': '...', 'x': ..., 'y': ...},
                    {'id': 2, 'name': '...', 'x': ..., 'y': ...}
                ],
                'task_id': 'generated_task_id'
            }
        """
        positions = []
        
        for dest_id in destination_ids:
            result = self.get_position_from_api(dest_id)
            if result['success']:
                positions.append(result['position'])
            else:
                logger.error(f'❌ Failed to get position for destination {dest_id}')
        
        if len(positions) == 0:
            return {'success': False, 'error': 'No positions retrieved'}
        
        # Generate task ID
        task_id = f"task_{int(time.time())}"
        
        return {
            'success': True,
            'positions': positions,
            'task_id': task_id
        }
    
    def send_status_to_api(self, status):
        """
        Gửi trạng thái robot lên API
        
        API: POST http://localhost:5170/api/robots/update-status
        Request body:
        {
            "code": "RB-01",
            "status": "transporting"
        }
        
        Available status values (from database enum):
        - transporting: Đang di chuyển đến điểm đích
        - awaiting_handover: Đang chờ bàn giao (đã đến nơi, chờ nhận hàng/giao hàng)
        - returning_to_station: Đang quay về trạm
        - at_station: Đang ở trạm (chờ nhiệm vụ mới)
        - completed: Hoàn thành nhiệm vụ
        - charging: Đang sạc pin
        - needs_attention: Cần chú ý (có lỗi, cần bảo trì)
        - manual_control: Đang điều khiển thủ công
        - offline: Ngoại tuyến
        
        Status mapping:
        - NAVIGATION_STARTED -> transporting
        - NAVIGATING_TO_TABLE -> transporting
        - IN_PROGRESS -> transporting
        - ARRIVED_AT_TABLE -> awaiting_handover (đã đến, chờ bàn giao)
        - RETURNING_HOME -> returning_to_station
        - RETURNING_HOME_PROGRESS -> returning_to_station
        - ARRIVED_HOME -> at_station
        - NAVIGATION_COMPLETED -> completed
        - NAVIGATION_FAILED -> needs_attention
        - NAVIGATION_CANCELED -> at_station
        - TIMEOUT -> needs_attention
        - NAVIGATION_ERROR -> needs_attention
        """
        try:
            # Map internal status to database enum values
            status_mapping = {
                'NAVIGATION_STARTED': 'transporting',
                'NAVIGATING_TO_TABLE': 'transporting',
                'IN_PROGRESS': 'transporting',
                'ARRIVED_AT_TABLE': 'awaiting_handover',
                'RETURNING_HOME': 'returning_to_station',
                'RETURNING_HOME_PROGRESS': 'returning_to_station',
                'ARRIVED_HOME': 'at_station',
                'NAVIGATION_COMPLETED': 'completed',
                'NAVIGATION_FAILED': 'needs_attention',
                'NAVIGATION_CANCELED': 'at_station',
                'TIMEOUT': 'needs_attention',
                'NAVIGATION_ERROR': 'needs_attention'
            }
            
            api_status = status_mapping.get(status, 'at_station')
            
            payload = {
                "code": self.config.robot_code,
                "status": api_status
            }
            
            response = requests.post(
                self.config.send_status_url,
                headers=self.config.headers,
                json=payload,
                timeout=5
            )
            
            response.raise_for_status()
            
            logger.info(f'✅ Status sent to API: {self.config.robot_code} -> {api_status} (from {status})')
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f'❌ Failed to send status to API: {e}')
            return False

class TableNavigator(Node):
    def __init__(self, api_handler=None, task_id=None):
        super().__init__('table_navigator')
        
        # Initialize API handler
        self.api_handler = api_handler
        self.task_id = task_id
        
        # Initialize navigator
        self.navigator = BasicNavigator()
        
        # Publisher for status updates (keep for ROS compatibility)
        self.status_publisher = self.create_publisher(String, '/robot_navigation_status', 10)
        
        # Wait for Nav2 to be active
        try:
            self.navigator.waitUntilNav2Active()
            self.get_logger().info('Navigation ready!')
        except Exception as e:
            self.get_logger().warn(f'Nav2 warning: {e}')
            self.get_logger().info('Continuing with basic navigation...')
    
    def publish_navigation_status(self, status, table_name=None, current_table=None, total_tables=None, position=None):
        """Publish navigation status to both ROS topic and API"""
        try:
            # Publish to ROS topic (existing functionality)
            status_msg = String()
            
            if table_name:
                if current_table is not None and total_tables is not None:
                    message = f"{status}|table:{table_name}|progress:{current_table}/{total_tables}"
                else:
                    message = f"{status}|table:{table_name}"
            else:
                message = status
                
            status_msg.data = message
            self.status_publisher.publish(status_msg)
            
            # Send to API if handler is available
            if self.api_handler:
                # Send simple status to API (just code and status)
                Thread(target=self.api_handler.send_status_to_api, args=(status,), daemon=True).start()
            
        except Exception as e:
            self.get_logger().error(f'Error publishing status: {e}')
    

    
    def create_pose(self, x, y):
        """Create a PoseStamped from coordinates"""
        pose = PoseStamped()
        pose.header.frame_id = 'map'
        pose.header.stamp = self.get_clock().now().to_msg()
        pose.pose.position.x = x
        pose.pose.position.y = y
        pose.pose.position.z = 0.0
        pose.pose.orientation.w = 1.0
        return pose
    
    def parse_positions_from_api(self, positions_data):
        """
        Convert API positions data to PoseStamped list with table names
        
        positions_data format:
        [
            {"x": 1.5, "y": 2.3, "name": "Table_A"},
            {"x": 3.0, "y": 4.5, "name": "Table_B"}
        ]
        """
        waypoints = []
        table_names = []
        
        for idx, position in enumerate(positions_data):
            try:
                # Extract coordinates
                x = float(position['x'])
                y = float(position['y'])
                
                # Get table name (use default if not provided)
                table_name = position.get('name', f"Position_{idx + 1}")
                
                # Create pose
                waypoints.append(self.create_pose(x, y))
                table_names.append(table_name)
                
                self.get_logger().info(f'✅ Added waypoint: {table_name} at x={x:.2f}, y={y:.2f}')
                
            except (KeyError, ValueError, TypeError) as e:
                self.get_logger().error(f'❌ Invalid position data: {position}, error: {e}')
                continue
        
        return waypoints, table_names
    def navigate_to_single_waypoint(self, waypoint, table_name, current_table=None, total_tables=None):
        """Navigate to a single waypoint with timeout and error handling"""
        position_data = {
            "x": waypoint.pose.position.x,
            "y": waypoint.pose.position.y
        }
        
        if table_name == "HOME_POSITION":
            self.get_logger().info('Returning to home position...')
            self.publish_navigation_status("RETURNING_HOME", table_name="HOME_POSITION", position=position_data)
        else:
            self.get_logger().info(f'Going to {table_name} ({current_table}/{total_tables})')
            self.get_logger().info(f'Target: x={waypoint.pose.position.x:.2f}, y={waypoint.pose.position.y:.2f}')
            self.publish_navigation_status("NAVIGATING_TO_TABLE", table_name, current_table, total_tables, position=position_data)
        
        # Send navigation goal
        self.navigator.goToPose(waypoint)
        
        # Wait for result with timeout
        timeout_counter = 0
        max_timeout = 300  # 30 seconds
        
        while not self.navigator.isTaskComplete() and timeout_counter < max_timeout:
            if shutdown_requested:
                self.get_logger().info('🛑 Shutdown requested during navigation, canceling...')
                self.navigator.cancelTask()
                self.publish_navigation_status("NAVIGATION_CANCELED", table_name="SHUTDOWN_REQUESTED", position=position_data)
                return False
                
            # Log progress every 5 seconds
            if timeout_counter % 50 == 0:
                feedback = self.navigator.getFeedback()
                if feedback:
                    distance_remaining = feedback.distance_remaining
                    self.get_logger().info(f'Distance remaining to {table_name}: {distance_remaining:.2f}m')
                    
                    # Publish progress update
                    progress_data = position_data.copy()
                    progress_data["distance_remaining"] = distance_remaining
                    
                    if table_name == "HOME_POSITION":
                        self.publish_navigation_status("RETURNING_HOME_PROGRESS", table_name="HOME_POSITION", position=progress_data)
                    else:
                        self.publish_navigation_status("IN_PROGRESS", table_name, current_table, total_tables, position=progress_data)
                        
            time.sleep(0.1)
            timeout_counter += 1
        
        # Check for timeout
        if timeout_counter >= max_timeout:
            self.get_logger().error(f'❌ Timeout reaching {table_name} after 30 seconds')
            self.publish_navigation_status("TIMEOUT", table_name, current_table, total_tables, position=position_data)
            self.navigator.cancelTask()
            return False
        
        # Check result
        result = self.navigator.getResult()
        if result == TaskResult.SUCCEEDED:
            if table_name == "HOME_POSITION":
                self.get_logger().info('✅ Successfully returned to home position!')
                self.publish_navigation_status("ARRIVED_HOME", table_name="HOME_POSITION", position=position_data)
            else:
                self.get_logger().info(f'✅ Arrived at {table_name}')
                self.get_logger().info(f'✅ Tao da den day {table_name} roi nhe!')
                                
                self.publish_navigation_status("ARRIVED_AT_TABLE", table_name, current_table, total_tables, position=position_data)
            return True
        elif result == TaskResult.CANCELED:
            self.get_logger().warn(f'❌ Navigation to {table_name} was canceled')
            self.publish_navigation_status("NAVIGATION_CANCELED", table_name, current_table, total_tables, position=position_data)
            return False
        else:  # FAILED
            self.get_logger().error(f'❌ Failed to reach {table_name}')
            self.publish_navigation_status("NAVIGATION_FAILED", table_name, current_table, total_tables, position=position_data)
            return False
    
    def navigate_to_tables(self, positions_data, return_home=False, home_position=None):
        """Navigate to tables in sequence and optionally return to home position"""
        # Publish start status
        self.publish_navigation_status("NAVIGATION_STARTED")
        
        # Parse positions from API data
        waypoints, table_names = self.parse_positions_from_api(positions_data)
        
        if not waypoints:
            self.get_logger().warn('No waypoints to navigate to!')
            self.publish_navigation_status("NAVIGATION_FAILED", table_name="NO_WAYPOINTS")
            return False
        
        # Add home position if requested
        if return_home and home_position:
            try:
                x = float(home_position['x'])
                y = float(home_position['y'])
                home_pose = self.create_pose(x, y)
                waypoints.append(home_pose)
                table_names.append("HOME_POSITION")
                self.get_logger().info(f'🏠 Return point (Home): x={x:.2f}, y={y:.2f}')
            except (KeyError, ValueError, TypeError) as e:
                self.get_logger().error(f'❌ Invalid home position data: {e}')
        
        total_tables = len(waypoints) - (1 if return_home and home_position else 0)
        
        self.get_logger().info(f'🚀 Starting navigation through {total_tables} positions')
        self.get_logger().info(f'📋 Position list: {table_names}')
        
        try:
            # Navigate through each waypoint
            for i, (waypoint, table_name) in enumerate(zip(waypoints, table_names)):
                # Check shutdown signal
                if shutdown_requested:
                    self.get_logger().info('🛑 Shutdown requested, stopping navigation...')
                    self.publish_navigation_status("NAVIGATION_CANCELED", table_name="SHUTDOWN_REQUESTED")
                    return False
                
                # Navigate to waypoint
                if table_name == "HOME_POSITION":
                    success = self.navigate_to_single_waypoint(waypoint, table_name)
                else:
                    current_table = i + 1
                    success = self.navigate_to_single_waypoint(waypoint, table_name, current_table, total_tables)
                
                # Continue to next waypoint even if current one fails
                if not success and table_name != "HOME_POSITION":
                    self.get_logger().warn(f'Failed to reach {table_name}, continuing to next waypoint...')
                    continue
            
            self.get_logger().info('🎉 Completed all navigation tasks!')
            self.publish_navigation_status("NAVIGATION_COMPLETED")
            
            # Wait to ensure status is sent
            time.sleep(2.0)
            
            self.get_logger().info('🛑 Stopping script after completing navigation')
            return True
            
        except Exception as e:
            self.get_logger().error(f'Error during navigation: {e}')
            self.publish_navigation_status("NAVIGATION_ERROR", table_name=f"ERROR: {str(e)}")
            return False

def main():
    # Setup signal handlers for clean shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Determine mode: API or command line
    use_api = os.environ.get('USE_API', 'false').lower() == 'true' or '--api' in sys.argv
    
    try:
        positions_array = []
        task_id = None
        api_handler = None
        destination_ids = []
        
        if use_api:
            print("="*60)
            print("🌐 API MODE: Fetching positions from API")
            print("="*60)
            
            # Initialize API handler
            api_config = APIConfig()
            api_handler = APIHandler(api_config)
            
            # Get destination IDs from command line or environment
            if len(sys.argv) > 2:
                # Format: python gotoPos.py --api 1 2 3
                destination_ids = [int(x) for x in sys.argv[2:] if x.isdigit()]
            else:
                # Get from environment variable
                dest_ids_str = os.environ.get('DESTINATION_IDS', '')
                if dest_ids_str:
                    destination_ids = [int(x.strip()) for x in dest_ids_str.split(',') if x.strip().isdigit()]
            
            if not destination_ids:
                print("❌ No destination IDs provided!")
                print("Usage: python3 gotoPos.py --api <destination_id1> <destination_id2> ...")
                print("Example: python3 gotoPos.py --api 1 2 3")
                print("Or set environment: DESTINATION_IDS=1,2,3")
                sys.exit(1)
            
            print(f"📍 Destination IDs: {destination_ids}")
            
            # Get positions from API
            api_response = api_handler.get_multiple_positions(destination_ids)
            
            if not api_response.get('success'):
                print(f"❌ Failed to get positions from API: {api_response.get('error')}")
                sys.exit(1)
            
            positions_array = api_response['positions']
            task_id = api_response.get('task_id')
            
        else:
            print("="*60)
            print("💻 COMMAND LINE MODE: Using provided JSON data")
            print("="*60)
            
            # Parse command line arguments
            if len(sys.argv) < 2:
                print("Usage:")
                print("  API Mode:     python3 gotoPos.py --api <destination_id1> <destination_id2> ...")
                print("                Example: python3 gotoPos.py --api 1 2 3")
                print("")
                print("  Manual Mode:  python3 gotoPos.py '<json_array>'")
                print('                Example: python3 gotoPos.py \'[{"x":10.36,"y":105.49,"name":"Room 101"}]\'')
                print("")
                print("Environment Variables for API Mode:")
                print("  USE_API=true")
                print("  ROBOT_CODE=RB-01")
                print("  DESTINATION_IDS=1,2,3")
                print("  GET_POSITIONS_API=http://localhost:5170/api/destinations/{id}/position")
                print("  SEND_STATUS_API=http://localhost:5170/api/robots/update-status")
                sys.exit(1)
            
            arg = sys.argv[1]
            
            # Skip --api flag if present
            if arg == '--api':
                print("Error: --api flag detected but no destination IDs provided")
                print("Usage: python3 gotoPos.py --api 1 2 3")
                sys.exit(1)
            
            # Check if argument is a file path
            if os.path.exists(arg) and arg.endswith('.json'):
                print(f"Reading from file: {arg}")
                with open(arg, 'r', encoding='utf-8') as f:
                    positions_json = f.read().strip()
            else:
                # Otherwise treat as JSON string
                positions_json = arg
            
            # Parse JSON array
            positions_array = json.loads(positions_json)
            
            if not isinstance(positions_array, list):
                print("Error: Argument must be a JSON array")
                sys.exit(1)
        
        print(f"📋 Received {len(positions_array)} positions")
        for idx, pos in enumerate(positions_array, 1):
            print(f"  {idx}. {pos.get('name', 'Unknown')} - x={pos.get('x'):.2f}, y={pos.get('y'):.2f}")
        
        if task_id:
            print(f"🆔 Task ID: {task_id}")

        
        # Initialize ROS2
        rclpy.init()
        
        # Create navigator with API handler
        navigator = TableNavigator(api_handler=api_handler, task_id=task_id)
        
        # Perform navigation (no return home, positions come from API)
        success = navigator.navigate_to_tables(positions_array, return_home=False, home_position=None)
        
        # Cleanup
        navigator.get_logger().info('🧹 Cleaning up resources...')
        
        if success:
            print("✅ Navigation completed successfully!")
            navigator.get_logger().info('✅ Navigation completed successfully, exiting...')
            
            # Send final success status to API
            if api_handler:
                api_handler.send_status_to_api("NAVIGATION_COMPLETED")
            
            time.sleep(1.0)
            sys.exit(0)
        else:
            print("❌ Navigation failed!")
            navigator.get_logger().error('❌ Navigation failed, exiting...')
            
            # Send final failure status to API
            if api_handler:
                api_handler.send_status_to_api("NAVIGATION_FAILED")
            
            sys.exit(1)
            
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        if len(sys.argv) > 1:
            print(f"Received argument: {sys.argv[1]}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        if 'navigator' in locals():
            navigator.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()

if __name__ == '__main__':
    main()
