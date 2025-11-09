#!/usr/bin/env python3

import os
from pathlib import Path
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, TimerAction
from launch.substitutions import LaunchConfiguration, Command
from launch_ros.actions import Node
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.parameter_descriptions import ParameterValue


def generate_launch_description():
    # --- Package paths ---
    driver_share = get_package_share_directory('robot_driver')

    # --- URDF/Xacro ---
    model_file = os.path.join(driver_share, 'urdf', 'robot.xacro')
    robot_description = ParameterValue(
        Command(['xacro ', model_file]),
        value_type=str
    )

    # --- Configs ---
    hardware_config = Path(driver_share, 'config', 'hardware.yaml')
 
    # --- Launch args ---
    use_sim_time = LaunchConfiguration('use_sim_time', default='false')

    robot_api_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(
                get_package_share_directory('robot_api'),
                'launch',
                'robot_api.launch.py'
            )
        )
    )


    return LaunchDescription([
        # Declare args
        DeclareLaunchArgument(
            'use_sim_time',
            default_value='false',
            description='Use simulation clock if true'
        ),

        # Robot state publisher (publish TF tree from URDF/Xacro)
        Node(
            package='robot_state_publisher',
            executable='robot_state_publisher',
            name='robot_state_publisher',
            output='screen',
            parameters=[{'robot_description': robot_description,
                         'use_sim_time': use_sim_time}],
        ),

        # Delay 1s -> bring up STM32 controller
        Node(
            package='robot_driver',
            executable='stm32_controller.py',
            name='stm32_odom',
            output='screen',
            parameters=[hardware_config],
        ),
        Node(
            package='rplidar_ros',
            executable='rplidar_node',
            name='rplidar_node',
            output='screen',
            parameters=[hardware_config],
        ),
        # robot_api_launch
    ])
