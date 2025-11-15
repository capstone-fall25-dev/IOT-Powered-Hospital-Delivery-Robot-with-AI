from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
   
   

    goto_pose_node = Node(
        package="robot_api",
        executable="gotoPos.py",
        name="goto_pose_node",
        output="screen"
    )

    position_node = Node(
        package="robot_api",
        executable="position_pos.py",
        name="position_robot_node",
        output="screen"
    )
    stream_map_node = Node(
        package="robot_api",
        executable="stream_map_api.py",
        name="stream_map_node",
        output="screen"
    )

   
    ld = LaunchDescription()
    ld.add_action(position_node)
    ld.add_action(stream_map_node)
    ld.add_action(goto_pose_node)

    return ld
    
