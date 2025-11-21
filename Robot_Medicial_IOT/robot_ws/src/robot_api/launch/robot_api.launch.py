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
    stream_map_node = Node(
        package="robot_api",
        executable="stream_map_api.py",
        name="stream_map_node",
        output="screen"
    )

    control_robot_node = Node(
        package="robot_api",
        executable="control_robot_api.py",
        name="control_robot_node",
        output="screen"
    )

    map_api_node = Node(
        package="robot_api",
        executable="map_api.py",
        name="map_api_node",
        output="screen"
    )   
    
    voice_control_node = Node(
    package='robot_api',
    executable='audio_player_signalr.py',
    name='audio_player_node',
    output='screen'
    )

    mic_control_node = Node(
    package='robot_api',
    executable='robot_mic_streamer.py',
    name='robot_mic_streamer_node',
    output='screen'
    ) 

    ld = LaunchDescription()
    ld.add_action(control_box_node)
    ld.add_action(camera_node)
    ld.add_action(position_node)
    ld.add_action(stream_map_node)
    ld.add_action(control_robot_node)
    ld.add_action(map_api_node)
    ld.add_action(goto_pose_node)
    ld.add_action(voice_control_node)
    ld.add_action(mic_control_node)
    return ld
    
