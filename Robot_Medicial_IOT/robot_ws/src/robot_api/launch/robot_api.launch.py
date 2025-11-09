from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
   
    control_box_node = Node(
        package='robot_api',
        executable='control_box.py',
        name='control_box_node',
        output='screen'
            
    ) 
    camera_node = Node(
        package='robot_api',
        executable='read_cam.py',
        name='camera_robot_node',
        output='screen'
    )

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
    ld = LaunchDescription()
    ld.add_action(control_box_node)
    ld.add_action(camera_node)
    ld.add_action(position_node)

    return ld
    
