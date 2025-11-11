from launch import LaunchDescription
from launch_ros.actions import Node
from ament_index_python import get_package_share_directory
import os
def generate_launch_description():
    file_yaml = os.path.join(get_package_share_directory("robot_driver"), 'twist_mux.yaml')
    return LaunchDescription([
        Node(
            package='twist_mux',
            executable='twist_mux',
            name='twist_mux',
            output='screen',
            parameters=[{
                'cfg_file': file_yaml
            }]
        )
    ])
