from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from ament_index_python.packages import get_package_share_directory
from pathlib import Path
import os

def generate_launch_description():
    # Đường dẫn tới gói nav2_bringup
    nav2_bringup_dir = FindPackageShare('nav2_bringup').find('nav2_bringup')
    robot_navigation_dir = FindPackageShare('robot_navigation').find('robot_navigation')

    # Đường dẫn file YAML và bản đồ
    params_file = LaunchConfiguration('params_file')
    map_file = LaunchConfiguration('map')
    
 
    home = os.path.expanduser('~')
    appdata_map = os.path.join("/home/tungduong/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws/src/robot_navigation/map",'homeMap.yaml')
    return LaunchDescription([
        # Tham số đầu vào
        DeclareLaunchArgument(
            'params_file',
            default_value='/home/tungduong/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws/src/robot_navigation/param/robot_2.yaml',
            description='Đường dẫn đến file tham số YAML'
        ),
        # pointcloud_to_laserscan_node,
        DeclareLaunchArgument(
            'map',
            default_value=appdata_map,
            description='Đường dẫn đến file bản đồ YAML'
        ),
        # depth_to_laser_node,

        # Bao gồm launch mặc định của nav2
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(
                os.path.join(nav2_bringup_dir, 'launch', 'bringup_launch.py')
            ),
            launch_arguments={
                'params_file': params_file,
                'map': map_file
            }.items(),
        ),
        # IncludeLaunchDescription(
        #     PythonLaunchDescriptionSource(
        #         os.path.join(robot_navigation_dir, 'launch', 'rviz_view_launch.py')
        #     )
        # )
    ])
