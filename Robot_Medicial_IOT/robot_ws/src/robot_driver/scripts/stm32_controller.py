#!/usr/bin/env python3
"""
STM32 Robot Controller - ROS2 Serial Communication Interface

This script provides a comprehensive ROS2 interface for communicating with STM32-based
robotic systems. It handles bidirectional communication for motor control, sensor data
acquisition, and real-time odometry fusion.

Key Features:
- Serial communication with STM32 microcontroller
- Differential drive kinematics for wheel-based robots
- IMU and encoder data fusion using Kalman filtering
- Real-time odometry calculation and publishing
- VL53L0X range sensor integration
- CSV data logging for analysis and debugging
- Robust error handling and automatic reconnection

Communication Protocol:
- Outbound: Motor duty cycles as "left_duty right_duty\n"
- Inbound: Sensor data as "v_left v_right ax ay az gx gy gz yaw\n"
- Data rate: Configurable (default 25Hz) via timer-based processing

Coordinate Frames:
- odom → base_footprint (robot pose in odometry frame)
- imu_link (IMU sensor frame)
- vl05_1, vl05_2, vl05_3, vl05_4 (range sensor frames)

Dependencies:
- kalman_filter.py: Custom Kalman filter implementation for sensor fusion
- tf_transformations: Quaternion math (fallback implementation included)
"""

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist, TransformStamped
from nav_msgs.msg import Odometry
from sensor_msgs.msg import Imu, Range
import serial
import time
import math
import csv
import os
from datetime import datetime
from tf2_ros import TransformBroadcaster
from kalman_filter import KalmanFilter
from std_msgs.msg import String
from sensor_msgs.msg import LaserScan

try:
    from tf_transformations import quaternion_from_euler
except ImportError:
    def quaternion_from_euler(roll, pitch, yaw):
        """
        Fallback quaternion conversion function.
        
        Converts Euler angles (roll, pitch, yaw) to quaternion representation
        when tf_transformations package is not available.
        
        Args:
            roll (float): Rotation around X-axis (radians)
            pitch (float): Rotation around Y-axis (radians)  
            yaw (float): Rotation around Z-axis (radians)
            
        Returns:
            list: [qx, qy, qz, qw] quaternion components
            
        Note:
            Uses standard aerospace sequence (ZYX) for Euler angle conversion.
            For ground robots, typically only yaw is non-zero.
        """
        qx = math.sin(roll/2) * math.cos(pitch/2) * math.cos(yaw/2) - math.cos(roll/2) * math.sin(pitch/2) * math.sin(yaw/2)
        qy = math.cos(roll/2) * math.sin(pitch/2) * math.cos(yaw/2) + math.sin(roll/2) * math.cos(pitch/2) * math.sin(yaw/2)
        qz = math.cos(roll/2) * math.cos(pitch/2) * math.sin(yaw/2) - math.sin(roll/2) * math.sin(pitch/2) * math.cos(yaw/2)
        qw = math.cos(roll/2) * math.cos(pitch/2) * math.cos(yaw/2) + math.sin(roll/2) * math.sin(pitch/2) * math.sin(yaw/2)
        return [qx, qy, qz, qw]

class STM32Driver(Node):
    """
    STM32 Robot Controller - Main ROS2 Node Class
    
    This class provides a complete interface for controlling STM32-based robots through
    serial communication. It handles motor commands, sensor data processing, odometry
    calculation, and real-time publishing of robot state information.
    
    Architecture:
    - Timer-based serial communication (non-blocking, replaces threading)
    - Kalman filter integration for sensor fusion
    - Differential drive kinematics for wheel-based robots
    - Multi-sensor support (IMU, encoders, range sensors)
    - CSV logging for data analysis and debugging
    
    ROS2 Interface:
    - Subscribes to: /cmd_vel (robot motion commands)
    - Publishes: /odom (odometry), /imu (IMU data), /vl05_* (range sensors)
    - TF Frames: Publishes odom→base_footprint transform
    
    Communication Protocol:
    - Sends: "duty_left duty_right\n" (motor commands)
    - Receives: "v_left v_right ax ay az gx gy gz yaw\n" (sensor data)
    """
    
    def __init__(self):
        super().__init__('stm32_driver')
        
        # ========================================================================================
        # ROS2 PARAMETER DECLARATIONS
        # ========================================================================================
        # These parameters can be set via launch files, command line, or parameter server
        
        # Serial Communication Parameters
        self.declare_parameter('port', '/dev/stm32_uart')           # Serial port device path (e.g., /dev/ttyUSB0, /dev/ttyACM0)
        self.declare_parameter('baudrate', 115200)                  # Serial communication speed (common: 9600, 57600, 115200, 230400)
        
        # Robot Physical Parameters (Critical for accurate kinematics)
        self.declare_parameter('wheel_radius', 0.045)                # Wheel radius in meters (measure from wheel center to ground contact)
        self.declare_parameter('wheel_base', 0.26)                   # Distance between wheel centers in meters (left to right)
        
        # System Configuration Parameters  
        self.declare_parameter('debug_mode', True)                  # Enable verbose logging and debug output
        self.declare_parameter('data_rate_hz', 25.0)                # Serial data processing frequency (Hz) - affects responsiveness vs CPU load
        
        # Sensor Fusion Parameters
        self.declare_parameter('use_sensor_fusion', False)           # Enable Kalman filter fusion of IMU + encoder data
        self.declare_parameter('publish_imu', True)                 # Publish raw IMU data to /imu topic
        self.declare_parameter('imu_frame_id', 'imu_link')          # TF frame for IMU sensor
        
        # Data Logging Parameters
        self.declare_parameter('save_to_csv', False)                # Enable CSV logging for data analysis
        self.declare_parameter('csv_file_path', os.path.expanduser('~/stm32_data.csv'))  # CSV output file path
        
        # ========================================================================================
        # PARAMETER RETRIEVAL AND VALIDATION
        # ========================================================================================
        # Extract parameter values from ROS2 parameter server with runtime validation
        
        # Serial communication settings
        self.port_name = self.get_parameter('port').value              # Device path for STM32 connection
        self.baudrate = self.get_parameter('baudrate').value           # Must match STM32 UART configuration
        
        # Robot kinematics - CRITICAL: Must match physical robot dimensions
        self.wheel_radius = self.get_parameter('wheel_radius').value   # Used for velocity calculations (v = ω × r)
        self.wheel_base = self.get_parameter('wheel_base').value       # Used for turning radius calculations
        
        # System behavior settings
        self.debug_mode = self.get_parameter('debug_mode').value       # Controls logging verbosity
        self.data_rate_hz = self.get_parameter('data_rate_hz').value   # Timer frequency for serial processing
        
        # Sensor processing configuration
        self.use_sensor_fusion = self.get_parameter('use_sensor_fusion').value      # Enable Kalman filtering
        self.publish_imu_enabled = self.get_parameter('publish_imu').value          # Publish raw IMU messages
        self.imu_frame_id = self.get_parameter('imu_frame_id').value                # TF frame identifier
        
        # Data logging settings
        self.save_to_csv = self.get_parameter('save_to_csv').value                  # Enable data export
        self.csv_file_path = self.get_parameter('csv_file_path').value              # Output file location
        
        # ========================================================================================
        # ROS2 COMMUNICATION INTERFACE SETUP
        # ========================================================================================
        
        # Subscribers - Incoming robot commands
        self.cmd_vel_subscription = self.create_subscription(
            Twist, '/cmd_vel', self.cmd_vel_callback, 10           # Robot velocity commands from navigation/teleop
        )

        self.control_box_msg = '0 0'
        self.control_box_status = False
        self.control_box_subcription = self.create_subscription(
            String, '/control_box', self.control_box_callback, 10
        )
        # self.get_logger().info(f"status: {self.control_box_status}")

        # Publishers - Outgoing robot state information
        self.odom_publisher = self.create_publisher(Odometry, '/odom', 10)      # Robot pose and velocity estimates
        self.imu_publisher = self.create_publisher(Imu, '/imu', 10)             # Raw inertial measurement data
        
        # Transform broadcaster - Coordinate frame relationships
        self.tf_broadcaster = TransformBroadcaster(self)                        # Publishes odom→base_footprint transforms
        
        # ========================================================================================
        # STATE VARIABLES AND SENSOR SETUP
        # ========================================================================================
        
        # Robot odometry state - Tracks robot position and orientation in world frame
        self.x = 0.0                    # X position in meters (forward/backward in odom frame)
        self.y = 0.0                    # Y position in meters (left/right in odom frame)  
        self.theta = 0.0                # Heading angle in radians (rotation about Z-axis)
        self.kalman = KalmanFilter()    # Sensor fusion filter for combining IMU + encoder data
        
        # VL53L0X Time-of-Flight Range Sensors - 4-sensor array for obstacle detection
        self.frame_ids = ['vl05_1', 'vl05_2', 'vl05_3', 'vl05_4']    # TF frame identifiers
        self.topics_vl05 = ['/vl05_1', '/vl05_2', '/vl05_3', '/vl05_4']  # ROS topic names
        self.range_vl05_pub = [                                        # Publisher array for each sensor
            self.create_publisher(Range, topic, 10)
            for topic in self.topics_vl05
        ]

        self.pub_range_sensor = self.create_publisher(
            LaserScan, "/tof_scan", 10
        )

        self.num_sensors = 4
        self.angle_span = 0.04  # rad (khoảng ±1.15°) để RViz tách 4 tia
        self.range_min = 0.02
        self.range_max = 2.0
        
        # Timing and processing state
        self.last_time = self.get_clock().now()    # Previous timestamp for delta-time calculations
        self.count = 0                              # Message counter for debug logging frequency control
        self.command = "0 0 0 0\n"
        # ========================================================================================
        # SERIAL COMMUNICATION STATE - Timer-based approach (NO THREADING)
        # ========================================================================================
        
        # Serial connection management
        self.serial_port = None                # PySerial port object for STM32 communication
        self.serial_buffer = ""               # Buffer for incomplete serial messages
        self.consecutive_errors = 0           # Error counter for connection stability monitoring
        self.max_errors = 5                   # Threshold for triggering reconnection attempts
        
        # Motor command state tracking - Used for CSV logging and debugging
        self.last_duty_left = 0               # Previous left wheel duty cycle (-100 to +100)
        self.last_duty_right = 0              # Previous right wheel duty cycle (-100 to +100) 
        self.last_cmd_vx = 0.0                # Previous linear velocity command (m/s)
        self.last_cmd_vy = 0.0                # Previous lateral velocity command (m/s) - unused for differential drive
        self.last_cmd_omega = 0.0             # Previous angular velocity command (rad/s)
        
        
        # ======================================================================================== 
        # INITIALIZATION COMPLETION
        # ========================================================================================
        
        # CSV data logging setup - Optional feature for data analysis
        self.csv_writer = None                # CSV writer object for data export
        self.csv_file = None                  # File handle for CSV output
        if self.save_to_csv:
            self.setup_csv_logging()          # Initialize CSV file with timestamped filename
        
        # Establish serial communication with STM32
        self.connect_to_serial()              # Connect to STM32 via serial port
        
        # Timer-based serial processing - Replaces threading for better ROS2 integration
        self.timer_period = 1.0 / self.data_rate_hz        # Convert Hz to seconds for timer period
        self.serial_timer = self.create_timer(self.timer_period, self.read_serial_data)  # Non-blocking serial I/O
        
        # Initialization complete - Log system configuration
        self.get_logger().info(f'STM32 driver initialized without threading')
        self.get_logger().info(f'Data processing rate: {self.data_rate_hz} Hz (every {self.timer_period:.3f}s)')
        self.get_logger().info(f'Sensor fusion: {"enabled" if self.use_sensor_fusion else "disabled"}')
        self.get_logger().info(f'IMU publishing: {"enabled" if self.publish_imu_enabled else "disabled"}')
    
    def connect_to_serial(self):
        """
        Establish serial connection to STM32 microcontroller.
        
        Handles connection setup with comprehensive error handling and recovery.
        Includes proper port initialization, buffer clearing, and STM32 wake-up sequence.
        
        Connection Sequence:
        1. Close any existing connection
        2. Open new serial port with specified parameters
        3. Clear input/output buffers to remove stale data
        4. Send wake-up signal (0xFF) to STM32
        5. Reset error counters on successful connection
        
        Returns:
            bool: True if connection successful, False otherwise
            
        Side Effects:
            - Sets self.serial_port to active connection or None
            - Resets self.consecutive_errors counter
            - Logs connection status messages
            
        Error Handling:
            - SerialException: Port access issues (permissions, device not found)
            - General exceptions: Unexpected system errors during connection
        """
        try:
            if hasattr(self, 'serial_port') and self.serial_port:
                try:
                    if self.serial_port.is_open:
                        self.serial_port.close()
                except:
                    pass
            
            self.serial_port = serial.Serial(
                port=self.port_name,
                baudrate=self.baudrate,
                timeout=0.1,  # Non-blocking read with short timeout
                write_timeout=1.0
            )
            time.sleep(0.5)  # Short wait for connection
            self.serial_port.reset_input_buffer()
            self.serial_port.reset_output_buffer()
            self.consecutive_errors = 0
            self.get_logger().info(f'Successfully connected to STM32 on {self.port_name}')
            self.serial_port.write(b'\xFF') 
            time.sleep(1)
            # self.serial_port.write(b'\xAA') 
            return True
        except serial.SerialException as e:
            self.get_logger().error(f'Failed to connect to STM32: {e}')
            self.serial_port = None
            return False
        except Exception as e:
            self.get_logger().error(f'Unexpected error connecting to serial: {e}')
            self.serial_port = None
            return False
    
    def read_serial_data(self):
        """
        Timer callback for non-blocking serial data processing.
        
        This method replaces the traditional threading approach with a timer-based
        system that integrates better with ROS2's executor model. Called at the
        frequency specified by data_rate_hz parameter.
        
        Processing Flow:
        1. Check for available data in serial buffer
        2. Read available bytes without blocking
        3. Append to internal buffer for line assembly
        4. Process complete lines (terminated by '\n')
        5. Handle communication errors with automatic recovery
        
        Error Recovery:
        - Tracks consecutive errors to detect persistent issues
        - Triggers reconnection after max_errors threshold
        - Gracefully handles SerialException and decode errors
        
        Performance Considerations:
        - Non-blocking reads prevent ROS2 executor stalls
        - Buffer management handles partial message reception
        - Error counting prevents infinite reconnection loops
        """
        if not self.serial_port or not self.serial_port.is_open:
            return
        
        try:
            # Read available data with timeout
            if self.serial_port.in_waiting > 0:
                available_bytes = self.serial_port.in_waiting
                new_data = self.serial_port.read(available_bytes).decode('utf-8', errors='ignore')
                self.serial_buffer += new_data
                
                # Process complete lines
                while '\n' in self.serial_buffer:
                    line, self.serial_buffer = self.serial_buffer.split('\n', 1)
                    line = line.strip()
                    
                    if line:
                        self.process_serial_line(line)
                        
        except serial.SerialException as e:
            self.consecutive_errors += 1
            self.get_logger().error(f'Serial error: {e}')
            
            if self.consecutive_errors >= self.max_errors:
                self.get_logger().warn('Too many serial errors, attempting reconnect')
                self.connect_to_serial()
                
        except Exception as e:
            self.consecutive_errors += 1
            self.get_logger().error(f'Unexpected error reading serial: {e}')
        
        try:
            if self.serial_port and self.serial_port.is_open:
                self.serial_port.write(self.command.encode('utf-8'))
                self.serial_port.flush()
                print(self.command)
                # if '1' in command:
                #     time.sleep(2)
            else:
                self.get_logger().warn('Serial port not available for command sending')
        except serial.SerialException as e:
            self.get_logger().error(f'Failed to send command: {e}')
            self.connect_to_serial()
        except Exception as e:
            self.get_logger().error(f'Unexpected error sending command: {e}')
        
    
    def process_serial_line(self, line):
        """
        Parse and validate a complete line of sensor data from STM32.
        
        Expected Data Format: "v_left v_right ax ay az gx gy gz yaw"
        - v_left, v_right: Wheel velocities from encoders (rad/s)
        - ax, ay, az: Linear accelerations from IMU (g-force)
        - gx, gy, gz: Angular velocities from IMU (rad/s)  
        - yaw: Absolute orientation from IMU (radians)
        
        Args:
            line (str): Complete data line from serial communication
            
        Data Validation:
        - Checks for minimum required data fields (9 values)
        - Converts string values to float with error handling
        - Validates data completeness before processing
        
        Processing Pipeline:
        1. Split line by whitespace
        2. Convert to numeric values
        3. Pass to process_combined_data() for sensor fusion
        4. Update counters and reset error tracking
        
        Error Handling:
        - ValueError: Invalid numeric conversion (corrupted data)
        - Insufficient data: Warns about incomplete messages
        - Rate-limited logging prevents spam during communication issues
        """
        try:
            # Split line by spaces and convert to float
            data_parts = line.split()
            # self.get_logger().info(f"Data values: {data_parts}")
            # Validate we have enough data values (9 expected)
            if len(data_parts) >= 12:
                data_values = [float(part) for part in data_parts[:12]]

                # Process the data
                self.process_combined_data(
                    data_values[0],   # v_left
                    data_values[1],   # v_right
                    data_values[2],   # ax
                    data_values[3],   # ay
                    data_values[4],   # az
                    data_values[5],   # gx
                    data_values[6],   # gy
                    data_values[7],   # gz
                    0.0, # yaw
                    data_values[8],   # vl05_1
                    data_values[9],  # vl05_2
                    data_values[10],  # vl05_3
                    data_values[11]   # vl05_4
                )
                
                self.count += 1
                self.consecutive_errors = 0  # Reset error counter on success
                
                # Debug logging (reduced frequency)
                if self.debug_mode and self.count % 40 == 0:
                    self.get_logger().info(f"Processed line {self.count}: {data_values} values")
                    # pass
                    
            else:
                if self.debug_mode:
                    self.get_logger().warn(f"Insufficient data values: {len(data_parts)}/13 - Line: '{line}'")
                    
        except ValueError as e:
            if self.count % 50 == 0:  # Reduce log spam
                self.get_logger().error(f"Data conversion error: {e} | Line: '{line}'")
        except Exception as e:
            if self.count % 50 == 0:  # Reduce log spam
                self.get_logger().error(f"Line processing error: {e} | Line: '{line}'")
    
    def inverse_kinematics(self, vx, vy, omega):
        """
        Convert robot body velocities to individual wheel velocities.
        
        Implements differential drive kinematics for a two-wheeled robot.
        Transforms desired robot motion into wheel speed commands.
        
        Kinematic Equations:
        - v_left = (vx - omega * wheelbase/2) / wheel_radius
        - v_right = (vx + omega * wheelbase/2) / wheel_radius
        
        Args:
            vx (float): Linear velocity in robot's forward direction (m/s)
            vy (float): Lateral velocity (m/s) - ignored for differential drive
            omega (float): Angular velocity around robot's vertical axis (rad/s)
            
        Returns:
            list: [v_left, v_right] wheel velocities in rad/s
            
        Physical Constraints:
        - Differential drive cannot move sideways (vy is ignored with warning)
        - Forward motion: both wheels rotate in same direction
        - Turning motion: wheels rotate at different speeds
        - Pure rotation: wheels rotate in opposite directions
        
        Note:
            Wheel velocities are in rad/s and must be converted to motor
            duty cycles before sending to STM32.
        """
        if abs(vy) > 0.01:
            self.get_logger().warn(f'Differential drive cannot move sideways, ignoring vy={vy}')
        
        v_left = (vx - (omega * self.wheel_base / 2.0)) / self.wheel_radius
        v_right = (vx + (omega * self.wheel_base / 2.0)) / self.wheel_radius
        
        return [v_left, v_right]
        
    def forward_kinematics(self, v_left, v_right):
        """
        Convert individual wheel velocities to robot body velocities.
        
        Implements forward differential drive kinematics to determine robot
        motion from encoder measurements. Used for odometry calculations.
        
        Kinematic Equations:
        - vx = (v_left + v_right) / 2  (average of wheel velocities)
        - vy = 0                       (no sideways motion possible)
        - omega = (v_right - v_left) / wheelbase  (difference creates rotation)
        
        Args:
            v_left (float): Left wheel velocity (rad/s) from encoder
            v_right (float): Right wheel velocity (rad/s) from encoder
            
        Returns:
            tuple: (vx, vy, omega) robot body velocities
                vx (float): Linear velocity in forward direction (m/s)
                vy (float): Lateral velocity - always 0.0 for differential drive
                omega (float): Angular velocity around vertical axis (rad/s)
                
        Motion Interpretation:
        - vx > 0: Robot moving forward
        - vx < 0: Robot moving backward  
        - omega > 0: Robot turning counter-clockwise (left)
        - omega < 0: Robot turning clockwise (right)
        """
        vx = (v_left + v_right) / 2.0
        vy = 0.0  # Differential drive cannot move sideways
        omega = (v_right - v_left) / self.wheel_base
        return vx, vy, omega
    
    def control_box_callback(self, msg : String):
        self.control_box_msg = msg.data
        self.control_box_status = True
        self.command = f"0 0 {self.control_box_msg}\n"

        # try:
        #     if self.serial_port and self.serial_port.is_open:
        #         self.serial_port.write(command.encode('utf-8'))
        #         self.serial_port.flush()
        #         self.get_logger().info(f"Control data: {command}")

        #     else:
        #         self.get_logger().warn('Serial port not available for command sending')
        # except serial.SerialException as e:
        #     self.get_logger().error(f'Failed to send command: {e}')
        #     self.connect_to_serial()
        # except Exception as e:
        #     self.get_logger().error(f'Unexpected error sending command: {e}')
       
    def cmd_vel_callback(self, msg):
        """
        Process incoming velocity commands from ROS2 navigation or teleop.
        
        Converts high-level robot motion commands into motor duty cycles
        for STM32 execution. Includes velocity scaling and safety limiting.
        
        Processing Pipeline:
        1. Extract linear and angular velocities from Twist message
        2. Convert to wheel velocities using inverse kinematics  
        3. Scale wheel velocities to motor duty cycles (-100 to +100)
        4. Apply velocity limits to prevent motor damage
        5. Send formatted command to STM32 via serial
        
        Args:
            msg (Twist): ROS2 velocity command message
                msg.linear.x: Forward velocity (m/s)
                msg.linear.y: Lateral velocity (m/s) - ignored for differential drive
                msg.angular.z: Rotation velocity (rad/s)
        
        Motor Command Format:
        - Serial output: "duty_left duty_right\n"
        - Duty cycles: Integer values from -100 to +100
        - Negative values: Reverse direction
        - Zero values: Motor stop
        
        Safety Features:
        - Velocity scaling to prevent exceeding motor limits (v_max = 5.973 rad/s)
        - Proportional scaling when commands exceed maximum capability
        - Serial port validation before command transmission
        - Automatic reconnection on communication failure
        
        Error Handling:
        - SerialException: Connection issues trigger reconnection
        - Port validation: Warns and attempts reconnection if port unavailable
        """
        if not self.serial_port or not self.serial_port.is_open:
            self.get_logger().warn('Serial port not open, attempting to reconnect')
            if not self.connect_to_serial():
                return
                
        vx = msg.linear.x
        vy = msg.linear.y
        omega = msg.angular.z
        
        wheel_velocities = self.inverse_kinematics(vx, vy, omega)
        
        # Convert to duty cycles
        v_max = 5.973  # Maximum velocity (rad/s)
        duty_max = 100  # Maximum duty cycle
        
        duty_cycles = []
        max_abs_vel = max(abs(vel) for vel in wheel_velocities)
        if max_abs_vel > v_max:
            scale_factor = v_max / max_abs_vel
            wheel_velocities = [vel * scale_factor for vel in wheel_velocities]
    
        for vel in wheel_velocities:
            duty = int((vel / v_max) * duty_max)
            duty = max(-duty_max, min(duty_max, duty))
            duty_cycles.append(duty)
       
        self.command = f"{duty_cycles[0]} {duty_cycles[1]} {self.control_box_msg}\n"
        # if  self.control_box_status:
        # self.get_logger().info(f"Comman send: {command}")
            # pass
        # if self.
        # Store motor commands for CSV logging
        self.last_duty_left = duty_cycles[0]
        self.last_duty_right = duty_cycles[1]
        self.last_cmd_vx = vx
        self.last_cmd_vy = vy
        self.last_cmd_omega = omega
        
        # if self.count % 10 == 0 and (duty_cycles[0] != 0 or duty_cycles[1] != 0):
        #     self.get_logger().info(f"Motor commands: {duty_cycles[0]} {duty_cycles[1]}")
       
        
    
    def update_range_vl05(self, current_time, vl05_1=float('inf'), vl05_3=float('inf'), vl05_4=float('inf'), vl05_2=float('nan')):
        """Enhanced VL53L0X range sensor processing - FIXED"""
        values = [vl05_1, vl05_2, vl05_3, vl05_4]

        for i in range(4):
            try:
                raw_value = values[i]
                
                # Validate input
                if math.isnan(raw_value) or raw_value <= 0:
                    continue  # Skip invalid readings
                if raw_value <= 0.3:
                    pass
                # Create Range message
                msg = Range()
                msg.header.stamp = current_time.to_msg()
                msg.header.frame_id = self.frame_ids[i]
                msg.radiation_type = Range.INFRARED
                msg.field_of_view = 0.001745     
                msg.min_range = 0.02          # 2cm minimum
                msg.max_range = 2.0           # 2m maximum
                
                # # FIX: Process individual value, not array
                range_value = float(raw_value)
                
                msg.range = max(msg.min_range, min(msg.max_range, range_value))
                
                # Publish the message
                self.range_vl05_pub[i].publish(msg)

                msg = LaserScan()
                msg.header.stamp = self.get_clock().now().to_msg()
                msg.header.frame_id = 'base_link'  # Link gốc robot

                msg.angle_min = -self.angle_span / 2
                msg.angle_max = self.angle_span / 2
                msg.angle_increment = (msg.angle_max - msg.angle_min) / (self.num_sensors - 1)
                msg.time_increment = 0.0
                msg.scan_time = 0.1
                msg.range_min = self.range_min
                msg.range_max = self.range_max
                msg.ranges = values
                msg.intensities = [1.0] * self.num_sensors

                self.pub_range_sensor.publish(msg)
                
                # Debug logging (reduced frequency)
                # if self.debug_mode and self.count % 500 == 0:
                #     sensor_name = self.frame_ids[i].replace('vl05_', '').upper()
                #     self.get_logger().info(f"VL05_{sensor_name}: raw={raw_value:.3f}m → final={msg.range:.3f}m")
                    
            except Exception as e:
                if self.count % 100 == 0:  # Reduce log spam
                    self.get_logger().error(f"VL05 sensor {i} processing error: {e}")

    def process_combined_data(self, v_left, v_right, ax, ay, az, gx, gy, gz, yaw=0.0, vl05_1=0.0, vl05_2=0.0, vl05_3=0.0, vl05_4=0.0):
        """
        Central sensor data processing hub for multi-sensor integration.
        
        Coordinates the processing of all sensor inputs and publishes robot state
        information to ROS2. Handles sensor fusion, coordinate transformations,
        and data logging.
        
        Args:
            Encoder Data:
                v_left (float): Left wheel velocity (rad/s)
                v_right (float): Right wheel velocity (rad/s)
            IMU Data:
                ax, ay, az (float): Linear accelerations (g-force)
                gx, gy, gz (float): Angular velocities (rad/s)
                yaw (float): Absolute heading angle (radians)
            Range Sensor Data (Optional):
                vl05_1, vl05_2, vl05_3, vl05_4 (float): Distance measurements (meters)
        
        Processing Pipeline:
        1. Synchronized timestamp generation for all data
        2. Forward kinematics: wheel velocities → robot velocities
        3. Sensor fusion: IMU + encoder data → enhanced odometry
        4. Range sensor processing and publishing
        5. IMU message publishing (if enabled)
        6. CSV data logging (if enabled)
        
        Coordinate System Conversions:
        - Encoder data: rad/s → m/s using wheel radius
        - IMU accelerations: g-force → m/s² (multiply by 9.81)
        - Angles: Maintains radians throughout processing
        
        Output Publishing:
        - /odom: Robot pose and velocity estimates
        - /imu: Raw inertial measurement data
        - /vl05_*: Range sensor measurements
        - TF: odom→base_footprint transform
        """
        # Get synchronized timestamp
        current_time = self.get_clock().now()
        
        # Process odometry data
        vx_odom, vy_odom, omega_odom = self.forward_kinematics(v_left, v_right)

        # Convert IMU units
        gx_rads = gx
        gy_rads = gy
        gz_rads = gz
        # yaw_rad = yaw

        # Update range sensors
        # self.update_range_vl05(current_time, vl05_1, vl05_3, vl05_4, vl05_2)
        
        # Update odometry
        if self.use_sensor_fusion:
            self.update_fused_odometry_with_timestamp(current_time, vx_odom, vy_odom, omega_odom, gz_rads)
        else:
            self.update_odometry_with_timestamp(current_time, vx_odom, vy_odom, omega_odom)

        # Publish IMU data
        if self.publish_imu_enabled:
            self.publish_imu_with_timestamp(current_time, ax, ay, az, gx_rads, gy_rads, gz_rads, yaw)
        # Update range sensors
        self.update_range_vl05(current_time, vl05_1, vl05_3, vl05_4, vl05_2)

        # Save to CSV if enabled
        if self.save_to_csv:
            self.save_data_to_csv(v_left, v_right, ax, ay, az, gx, gy, gz, yaw, 
                                self.last_duty_left, self.last_duty_right, 
                                self.last_cmd_vx, self.last_cmd_vy, self.last_cmd_omega)

    def update_fused_odometry_with_timestamp(self, current_time, vx, vy, omega, imu_yaw):
        """
        Update robot odometry using Kalman filter sensor fusion.
        
        Combines encoder-based velocity estimates with IMU orientation data
        to produce more accurate and stable odometry. Uses Extended Kalman
        Filter to handle sensor noise and bias correction.
        
        Args:
            current_time: ROS2 timestamp for synchronization
            vx (float): Linear velocity from encoders (m/s)
            vy (float): Lateral velocity - unused for differential drive
            omega (float): Angular velocity from encoders (rad/s)
            imu_yaw (float): Absolute orientation from IMU (radians)
        
        Kalman Filter State Vector:
        - [x, y, theta, vx, omega]: Position, orientation, and velocities
        
        Sensor Fusion Benefits:
        - Reduces encoder drift over long distances
        - Provides absolute orientation reference
        - Compensates for wheel slip and calibration errors
        - Improves localization accuracy for navigation
        
        Processing Flow:
        1. Calculate time delta for integration
        2. Run Kalman filter prediction and update steps
        3. Extract fused state estimates
        4. Publish enhanced odometry message
        5. Update internal position tracking
        """
        dt = (current_time - self.last_time).nanoseconds / 1e9
        
        if dt <= 0:
            return   
            
        self.publish_fused_odometry_with_timestamp(current_time, vx, vy, omega, imu_yaw, dt)
        self.last_time = current_time

    def publish_fused_odometry_with_timestamp(self, current_time, vx, vy, omega, imu_yaw, dt):
        """Publish fused odometry message"""
        odom = Odometry()
        odom.header.stamp = current_time.to_msg()
        odom.header.frame_id = 'odom'
        odom.child_frame_id = 'base_footprint'
        
        mu, sq = self.kalman.calculate_odomcombine(vx, omega, imu_yaw, dt)
        self.x = mu[0]
        self.y = mu[1]

        # Position
        odom.pose.pose.position.x = self.x
        odom.pose.pose.position.y = self.y
        odom.pose.pose.position.z = 0.0
        
        # # Normalize angle
        # if mu[2] > math.pi:
        #     mu[2] -= 2*math.pi
        # elif mu[2] < -math.pi:
        #     mu[2] += 2*math.pi
            
        # Orientation
        quaternion = quaternion_from_euler(0, 0, mu[2])
        odom.pose.pose.orientation.x = quaternion[0]
        odom.pose.pose.orientation.y = quaternion[1]
        odom.pose.pose.orientation.z = quaternion[2]
        odom.pose.pose.orientation.w = quaternion[3]
        
        # Velocity
        odom.twist.twist.linear.x = mu[3]
        odom.twist.twist.linear.y = 0.0
        odom.twist.twist.angular.z = mu[4]
        
        # Covariance matrices
        odom.pose.covariance = [sq[0,0], 0, 0, 0, 0, 0,
                                0, sq[1,1], 0, 0, 0, 0,
                                0, 0, 0, 0, 0, 0,
                                0, 0, 0, 0, 0, 0,
                                0, 0, 0, 0, 0, 0,
                                0, 0, 0, 0, 0, sq[2,2]]
        
        odom.twist.covariance = [sq[3,3], 0, 0, 0, 0, 0,
                                 0, 0, 0, 0, 0, 0,
                                 0, 0, 0, 0, 0, 0,
                                 0, 0, 0, 0, 0, 0,
                                 0, 0, 0, 0, 0, 0,
                                 0, 0, 0, 0, 0, sq[4,4]]
        
        # Publish odometry
        self.odom_publisher.publish(odom)
        
        # Publish TF
        t = TransformStamped()
        t.header.stamp = current_time.to_msg()
        t.header.frame_id = 'odom'
        t.child_frame_id = 'base_footprint'
        t.transform.translation.x = self.x
        t.transform.translation.y = self.y
        t.transform.translation.z = 0.0
        t.transform.rotation = odom.pose.pose.orientation
        
        self.tf_broadcaster.sendTransform(t)

    def update_odometry_with_timestamp(self, current_time, vx, vy, omega):
        """
        Update robot odometry using pure encoder data (no sensor fusion).
        
        Calculates robot position and orientation through dead reckoning
        based solely on wheel encoder measurements. Used when sensor fusion
        is disabled or as fallback method.
        
        Args:
            current_time: ROS2 timestamp for synchronization
            vx (float): Linear velocity from encoders (m/s)
            vy (float): Lateral velocity - always 0 for differential drive
            omega (float): Angular velocity from encoders (rad/s)
        
        Dead Reckoning Integration:
        - dx = vx * cos(theta) * dt  (forward motion in world frame)
        - dy = vx * sin(theta) * dt  (sideways motion in world frame)
        - dtheta = omega * dt        (rotation update)
        
        Limitations:
        - Accumulates error over time (drift)
        - Sensitive to wheel calibration accuracy
        - No correction for wheel slip or surface irregularities
        - Requires periodic localization updates for long-term accuracy
        
        Advantages:
        - Simple and computationally efficient
        - No dependency on additional sensors
        - Deterministic and predictable behavior
        """
        dt = (current_time - self.last_time).nanoseconds / 1e9
        
        if dt <= 0:
            return
        
        # Update position
        delta_x = vx * math.cos(self.theta) * dt
        delta_y = vx * math.sin(self.theta) * dt
        delta_theta = omega * dt 
        
        self.x += delta_x
        self.y += delta_y
        self.theta += delta_theta
        
        # Normalize theta
        self.theta = math.atan2(math.sin(self.theta), math.cos(self.theta))

    
        # Create odometry message
        odom = Odometry()
        odom.header.stamp = current_time.to_msg()
        odom.header.frame_id = 'odom'
        odom.child_frame_id = 'base_footprint'
        
        quaternion = quaternion_from_euler(0, 0, self.theta)
        
        # Position
        odom.pose.pose.position.x = self.x
        odom.pose.pose.position.y = self.y
        odom.pose.pose.position.z = 0.0
        
        # Orientation
        odom.pose.pose.orientation.x = quaternion[0]
        odom.pose.pose.orientation.y = quaternion[1]
        odom.pose.pose.orientation.z = quaternion[2]
        odom.pose.pose.orientation.w = quaternion[3]
        
        # Velocity
        odom.twist.twist.linear.x = vx
        odom.twist.twist.linear.y = 0.0
        odom.twist.twist.angular.z = omega
        
        # Covariance
        pose_cov = [0.0] * 36
        pose_cov[0] = 0.1   # x position variance
        pose_cov[7] = 0.1   # y position variance
        pose_cov[35] = 0.2  # yaw variance
        odom.pose.covariance = pose_cov
        
        twist_cov = [0.0] * 36
        twist_cov[0] = 0.1   # linear x velocity variance
        twist_cov[35] = 0.1  # angular z velocity variance
        odom.twist.covariance = twist_cov
        
        self.odom_publisher.publish(odom)
        
        # Publish TF
        t = TransformStamped()
        t.header.stamp = current_time.to_msg()
        t.header.frame_id = 'odom'
        t.child_frame_id = 'base_footprint'
        t.transform.translation.x = self.x
        t.transform.translation.y = self.y
        t.transform.translation.z = 0.0
        t.transform.rotation = odom.pose.pose.orientation
        
        self.tf_broadcaster.sendTransform(t)
        
        self.last_time = current_time

    def publish_imu_with_timestamp(self, current_time, ax, ay, az, gx, gy, gz, yaw):
        """Publish IMU data"""
        try:
            imu_msg = Imu()
            
            # Header
            imu_msg.header.stamp = current_time.to_msg()
            imu_msg.header.frame_id = self.imu_frame_id
            
            # Convert acceleration from g to m/s^2
            ax_ms2 = ax * 9.81
            ay_ms2 = ay * 9.81
            az_ms2 = az * 9.81

            # Linear acceleration
            imu_msg.linear_acceleration.x = ax_ms2
            imu_msg.linear_acceleration.y = ay_ms2
            imu_msg.linear_acceleration.z = az_ms2
            
            # Angular velocity
            imu_msg.angular_velocity.x = gx
            imu_msg.angular_velocity.y = gy
            imu_msg.angular_velocity.z = gz
            
            # Orientation (only yaw for differential drive)
            quaternion = quaternion_from_euler(0.0, 0.0, yaw)
            imu_msg.orientation.x = quaternion[0]
            imu_msg.orientation.y = quaternion[1]
            imu_msg.orientation.z = quaternion[2]
            imu_msg.orientation.w = quaternion[3]
            
            # Covariance matrices
            imu_msg.linear_acceleration_covariance = [
                0.04, 0.0, 0.0,
                0.0, 0.04, 0.0,
                0.0, 0.0, 0.04
            ]
            
            imu_msg.angular_velocity_covariance = [
                0.02, 0.0, 0.0,
                0.0, 0.02, 0.0,
                0.0, 0.0, 0.02
            ]
            
            imu_msg.orientation_covariance = [
                0.0, 0.0, 0.0,
                0.0, 0.0, 0.0,
                0.0, 0.0, 0.01
            ]
            
            # Publish
            self.imu_publisher.publish(imu_msg)
            
            # Debug logging
            # if self.debug_mode and self.count % 1000 == 0:
            #     self.get_logger().info(f'Published IMU: yaw={math.degrees(yaw):.1f}°')
    
        except Exception as e:
            self.get_logger().error(f'Error publishing IMU data: {e}')

    def setup_csv_logging(self):
        """Setup CSV file for data logging"""
        try:
            csv_dir = os.path.dirname(self.csv_file_path)
            if csv_dir and not os.path.exists(csv_dir):
                os.makedirs(csv_dir)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_name = os.path.splitext(self.csv_file_path)[0]
            ext = os.path.splitext(self.csv_file_path)[1]
            timestamped_path = f"{base_name}_{timestamp}{ext}"
            
            self.csv_file = open(timestamped_path, 'w', newline='')
            self.csv_writer = csv.writer(self.csv_file)
            
            header = ['timestamp', 'v_left', 'v_right', 'ax', 'ay', 'az', 'gx', 'gy', 'gz', 'yaw', 'duty_left', 'duty_right', 'cmd_vx', 'cmd_vy', 'cmd_omega']
            self.csv_writer.writerow(header)
            self.csv_file.flush()
            
            self.get_logger().info(f'CSV logging initialized: {timestamped_path}')
            
        except Exception as e:
            self.get_logger().error(f'Failed to setup CSV logging: {e}')
            self.save_to_csv = False

    def save_data_to_csv(self, v_left, v_right, ax, ay, az, gx, gy, gz, yaw, duty_left=0, duty_right=0, cmd_vx=0.0, cmd_vy=0.0, cmd_omega=0.0):
        """Save data to CSV file"""
        if self.save_to_csv and self.csv_writer:
            try:
                timestamp = time.time()
                row = [timestamp, v_left, v_right, ax, ay, az, gx, gy, gz, yaw, duty_left, duty_right, cmd_vx, cmd_vy, cmd_omega]
                self.csv_writer.writerow(row)
                
                if self.count % 10 == 0:
                    self.csv_file.flush()
                    
            except Exception as e:
                self.get_logger().error(f'Failed to save data to CSV: {e}')

    def destroy_node(self):
        """Clean up resources"""
        # Close CSV file
        if self.csv_file:
            try:
                self.csv_file.close()
                self.get_logger().info('CSV file closed')
            except Exception as e:
                self.get_logger().warn(f'Error closing CSV file: {e}')
        
        # Send stop command and close serial port
        if self.serial_port:
            try:
                if self.serial_port.is_open:
                    command = "0 0 0 0\n"
                    self.serial_port.write(command.encode('utf-8'))  # Stop command
                    self.serial_port.flush()
                    time.sleep(0.1)
                    # self.serial_port.write(b'\xFF') 
                    # self.serial_port.flush()
                    # time.sleep(0.1)
                    self.serial_port.close()
            except Exception as e:
                self.get_logger().warn(f'Error during cleanup: {e}')
            finally:
                self.serial_port = None
        
        super().destroy_node()

def main(args=None):
    """
    Main entry point for STM32 robot controller application.
    
    Initializes ROS2 communication system, creates the STM32Driver node,
    and starts the main execution loop with proper cleanup handling.
    
    Args:
        args: Command line arguments for ROS2 initialization (optional)
    
    Execution Flow:
    1. Initialize ROS2 communication system
    2. Create and configure STM32Driver node
    3. Enter ROS2 spin loop for message processing
    4. Handle shutdown gracefully with resource cleanup
    
    Error Handling:
    - KeyboardInterrupt: Graceful shutdown on Ctrl+C
    - General exceptions: Logs error and continues with cleanup
    - Resource cleanup: Ensures node destruction and ROS2 shutdown
    
    Usage:
        python3 stm32_controller.py
        ros2 run omni_base_driver stm32_controller.py
        
    Note:
        This function blocks until shutdown signal received.
        All ROS2 callbacks and timers execute within the spin() loop.
    """
    rclpy.init(args=args)
    
    try:
        stm32_driver = STM32Driver()
        rclpy.spin(stm32_driver)  # Main execution loop - blocks until shutdown
    except KeyboardInterrupt:
        pass  # Graceful shutdown on Ctrl+C
    except Exception as e:
        print(f"Error in main: {e}")
    finally:
        # Ensure proper cleanup regardless of exit method
        if 'stm32_driver' in locals():
            stm32_driver.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()