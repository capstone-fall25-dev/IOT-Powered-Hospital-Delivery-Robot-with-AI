#!/usr/bin/env python3
"""
Web Control Robot Node

This script provides remote control functionality for an omni-directional robot through:
1. WebSocket connection for receiving remote commands
2. ROS2 publisher for sending velocity commands to robot
3. Camera streaming via RTSP using FFmpeg
4. Real-time bidirectional communication with web control server

Author: Emily Robot Team
Date: 2025
License: MIT
"""

import asyncio
import websockets
import json
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
# from dotenv import load_dotenv
import os
import signal
import subprocess

# ============================================================================
# CONFIGURATION PARAMETERS
# ============================================================================

# Robot identification and server connection
# TODO: Move to config file for better deployment management
# Load biến môi trường từ file url.env
# load_dotenv("url.env")
# SERVER_URL = os.getenv("SERVER_URL", "ws://localhost:4000")
# ROBOT_ID = os.getenv("ROBOT_ID", "default_robot")
ROBOT_ID = ""  # Unique robot identifier
SERVER_URL = ""        # WebSocket server endpoint

# Robot velocity constraints and control parameters
MAX_LINEAR_VEL = 0.22   # Maximum linear velocity (m/s) - safety limit
MAX_ANGULAR_VEL = 2.84  # Maximum angular velocity (rad/s) - safety limit  
LIN_VEL_STEP = 0.05     # Linear velocity increment per command
ANG_VEL_STEP = 0.1      # Angular velocity increment per command

# Camera streaming configuration
SERVER_IP = "118.70.187.211"  # RTSP server IP address - TODO: Make configurable
RTSP_URL = f"rtsp://{SERVER_IP}:8554/{ROBOT_ID}"  # Complete RTSP stream URL
# FFmpeg command configuration for real-time video streaming
FFMPEG_CMD = [
    "ffmpeg",
    "-f", "v4l2",                    # Video4Linux2 input format
    "-framerate", "25",              # Target framerate (FPS)
    "-video_size", "640x480",        # Video resolution
    "-i", "/dev/webcam",             # Input device (camera)
    "-c:v", "libx264",               # H.264 video codec
    "-preset", "ultrafast",          # Encoding preset for low latency
    "-tune", "zerolatency",          # Tune for minimal latency
    "-pix_fmt", "yuv420p",           # Pixel format for compatibility
    "-x264-params", "bframes=0:keyint=25:min-keyint=25:scenecut=0",  # Low latency encoding
    "-f", "rtsp",                    # Output format (RTSP)
    "-rtsp_transport", "tcp",        # Use TCP transport for reliability
    RTSP_URL,                        # Output destination
]

# Global variable to track FFmpeg process
process = None

# ============================================================================
# CAMERA CONTROL FUNCTIONS
# ============================================================================
def start_camera():
    """
    Start camera streaming via FFmpeg to RTSP server
    
    Creates a new FFmpeg subprocess to capture video from webcam and stream it
    to the RTSP server. Handles process management to prevent duplicate streams.
    
    Returns:
        None
        
    Side Effects:
        - Updates global 'process' variable
        - Starts FFmpeg subprocess
        - Prints status messages
    """
    global process
    if process is None:
        print("📷 Starting camera stream...")
        # Start FFmpeg with signal handling to prevent interruption
        process = subprocess.Popen(
            FFMPEG_CMD,
            preexec_fn=lambda: signal.signal(signal.SIGINT, signal.SIG_IGN)
        )
        print(f"🎬 Camera streaming to {RTSP_URL}")
    else:
        print("⚠️ Camera already running")

def stop_camera():
    """
    Stop the active camera streaming process
    
    Gracefully terminates the FFmpeg process with timeout handling.
    Falls back to force kill if graceful termination fails.
    
    Returns:
        None
        
    Side Effects:
        - Updates global 'process' variable to None
        - Terminates FFmpeg subprocess
        - Prints status messages
    """
    global process
    if process:
        print("🛑 Stopping camera stream...")
        process.terminate()
        try:
            # Wait up to 3 seconds for graceful termination
            process.wait(timeout=3)
            print("✅ Camera stream stopped gracefully")
        except subprocess.TimeoutExpired:
            print("⚠️ Force killing ffmpeg")
            process.kill()
            print("🔪 Camera stream force stopped")
        process = None
    else:
        print("⚠️ Camera not running")

# ============================================================================
# ROS2 CONTROL NODE CLASS
# ============================================================================

class ControlDirectionNode(Node):
    """
    ROS2 Node for robot movement control
    
    This node handles velocity commands and publishes them to the robot's
    cmd_vel topic. It maintains current velocity state and applies safety
    constraints to prevent dangerous movements.
    
    Attributes:
        publisher: ROS2 publisher for Twist messages
        current_linear_vel: Current linear velocity (m/s)
        current_angular_vel: Current angular velocity (rad/s)
    """
    
    def __init__(self):
        """Initialize the control node with velocity publisher and state variables"""
        super().__init__('control_direction_client_node')
        
        # Create publisher for velocity commands
        self.publisher = self.create_publisher(Twist, '/cmd_vel', 10)
        
        # Initialize velocity state
        self.current_linear_vel = 0.0   # Current forward/backward velocity
        self.current_angular_vel = 0.0  # Current rotational velocity
        
        self.get_logger().info("🤖 Control Direction Node initialized")

    def constrain(self, input_vel, low_bound, high_bound):
        """
        Constrain velocity value within safe bounds
        
        Args:
            input_vel (float): Input velocity value
            low_bound (float): Minimum allowed velocity
            high_bound (float): Maximum allowed velocity
            
        Returns:
            float: Constrained velocity value
        """
        return max(min(input_vel, high_bound), low_bound)

    def update_velocity(self, linear_change=0.0, angular_change=0.0):
        """
        Update robot velocity with incremental changes
        
        Applies velocity changes while respecting safety limits and publishes
        the resulting Twist message to control the robot movement.
        
        Args:
            linear_change (float): Change in linear velocity (m/s)
            angular_change (float): Change in angular velocity (rad/s)
            
        Side Effects:
            - Updates internal velocity state
            - Publishes Twist message to /cmd_vel topic
            - Logs velocity information
        """
        # Apply changes with safety constraints
        self.current_linear_vel = self.constrain(
            self.current_linear_vel + linear_change,
            -MAX_LINEAR_VEL, MAX_LINEAR_VEL
        )
        self.current_angular_vel = self.constrain(
            self.current_angular_vel + angular_change,
            -MAX_ANGULAR_VEL, MAX_ANGULAR_VEL
        )

        # Create and publish velocity command
        twist = Twist()
        twist.linear.x = self.current_linear_vel
        twist.angular.z = self.current_angular_vel
        self.publisher.publish(twist)

        # Log velocity information
        msg = f"Published velocities - Linear: {self.current_linear_vel:.2f}, Angular: {self.current_angular_vel:.2f}"
        print("[DEBUG]", msg)
        self.get_logger().info(msg)

# ============================================================================
# WEBSOCKET CLIENT AND COMMAND PROCESSING
# ============================================================================


async def robot_client(control_node: ControlDirectionNode):
    """
    WebSocket client for receiving remote commands
    
    Maintains persistent connection to control server, processes incoming commands,
    and sends status updates back to server. Handles connection failures with
    automatic reconnection.
    
    Args:
        control_node (ControlDirectionNode): ROS2 node for robot control
        
    Returns:
        None (runs indefinitely)
        
    Command Types Supported:
        - MOVE_FORWARD: Increase forward velocity
        - MOVE_BACKWARD: Increase backward velocity  
        - TURN_LEFT: Increase counter-clockwise rotation
        - TURN_RIGHT: Increase clockwise rotation
        - STOP: Stop all movement immediately
        - DRAW_MAP: Trigger mapping functionality
        - start_camera: Begin video streaming
        - stop_camera: End video streaming
    """
    while True:
        try:
            async with websockets.connect(SERVER_URL) as ws:
                # Register robot with server
                register_msg = {"type": "register", "robotId": ROBOT_ID}
                await ws.send(json.dumps(register_msg))
                print(f"🤖 Robot {ROBOT_ID} connected to {SERVER_URL}")

                # Listen for incoming messages from server
                async for msg in ws:
                    # Parse incoming message
                    data = json.loads(msg)
                    print("📩 From server:", data)

                    # Process command messages
                    if data.get("type") == "command":
                        payload = data.get("payload", {})
                        action = payload.get("action")

                        # Movement commands - increment velocity by step amounts
                        if action == "MOVE_FORWARD":
                            print("➡️ Robot đi thẳng")
                            control_node.update_velocity(linear_change=LIN_VEL_STEP)
                        elif action == "MOVE_BACKWARD":
                            print("⬅️ Robot lùi")
                            control_node.update_velocity(linear_change=-LIN_VEL_STEP)
                        elif action == "TURN_LEFT":
                            print("↪️ Robot rẽ trái")
                            control_node.update_velocity(angular_change=ANG_VEL_STEP)
                        elif action == "TURN_RIGHT":
                            print("↩️ Robot rẽ phải")
                            control_node.update_velocity(angular_change=-ANG_VEL_STEP)
                        
                        # Emergency stop - immediate velocity reset
                        elif action == "STOP":
                            print("🛑 Robot dừng")
                            control_node.current_linear_vel = 0.0
                            control_node.current_angular_vel = 0.0
                            control_node.update_velocity(0.0, 0.0)
                        
                        # Mapping functionality (TODO: implement SLAM integration)
                        elif action == "DRAW_MAP":
                            print("🗺️ Robot bắt đầu vẽ bản đồ")
                            # TODO: Integrate with SLAM mapping service
                        
                        # Camera control commands
                        elif action == "start_camera":
                            start_camera()
                        elif action == "stop_camera":
                            stop_camera()
                        
                        # Handle unknown commands
                        else:
                            print("⚠️ Unknown action:", action)
                  
                        # Gửi status lại server
                        status_msg = {
                            "type": "status",
                            "payload": {
                                "action": action,
                                "result": "done",
                                "battery": 95
                            }
                        }
                        await ws.send(json.dumps(status_msg))
                        print("📤 Sent status back to server")
                    

        except Exception as e:
            print("❌ Connection lost, retrying in 5s:", e)
            await asyncio.sleep(5)


async def ros_spin(control_node: ControlDirectionNode):
    """
    Asynchronous ROS2 node spinning function.
    
    Continuously processes ROS2 callbacks while yielding control to other
    async tasks. Integrates ROS2 synchronous spinning with asyncio event loop.
    
    Args:
        control_node: The ROS2 node to spin
        
    Behavior:
        - Calls rclpy.spin_once() with 0.1s timeout for non-blocking operation
        - Yields control every 0.01s to allow other async tasks to run
        - Continues until ROS2 shutdown signal received
    """
    while rclpy.ok():
        rclpy.spin_once(control_node, timeout_sec=0.1)
        await asyncio.sleep(0.01)  # Yield control to other async tasks


async def main():
    """
    Main async entry point for the web control application.
    
    Architecture:
    - Pure async/await approach using asyncio.gather() for concurrency
    - Runs ROS2 node spinning and WebSocket client in parallel
    - Ensures proper resource cleanup on shutdown
    
    Execution Flow:
    1. Initialize ROS2 communication system
    2. Create robot control node for velocity commands
    3. Run ROS2 spinning and WebSocket client concurrently
    4. Cleanup resources when either task completes/fails
    """
    # Initialize ROS2 communication system
    rclpy.init()
    control_node = ControlDirectionNode()

    # Run ROS2 spinning and WebSocket client concurrently
    # Both tasks must complete before proceeding to cleanup
    await asyncio.gather(
        ros_spin(control_node),      # ROS2 message processing loop
        robot_client(control_node)   # WebSocket communication loop
    )

    # Cleanup: destroy node and shutdown ROS2
    control_node.destroy_node()
    rclpy.shutdown()


if __name__ == "__main__":
    # Entry point: run the async main function
    asyncio.run(main())
