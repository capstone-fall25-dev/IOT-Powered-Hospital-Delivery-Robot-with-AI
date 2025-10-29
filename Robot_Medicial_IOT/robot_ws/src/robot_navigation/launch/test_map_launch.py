from launch import LaunchDescription
from launch_ros.actions import LifecycleNode, Node
import os
from ament_index_python.packages import get_package_share_directory

def generate_launch_description():
    file_path = os.path.join(
        get_package_share_directory("robot_navigation"),
        "map",
        "map_1.yaml",
        "map_1.pgm"
    )

    map_server = LifecycleNode(
        package='nav2_map_server',
        executable='map_server',
        name='map_server',
        namespace='',
        output='screen',
        parameters=[{'yaml_filename': file_path}],
        emulate_tty=True,
    )

    lifecycle_manager = Node(
        package='nav2_lifecycle_manager',
        executable='lifecycle_manager',
        name='lifecycle_manager_map',
        output='screen',
        parameters=[{
            'use_sim_time': False,
            'autostart': True,
            'node_names': ['map_server']
        }],
    )
    
    return LaunchDescription([
        map_server,
        lifecycle_manager,
    ])
