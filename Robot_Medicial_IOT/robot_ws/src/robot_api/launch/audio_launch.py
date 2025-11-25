from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
   
   

    audio_call = Node(
        package="robot_api",
        executable="audio_call_node.py",
        name="audio_call_node",
        output="screen"
    )

    audio_player = Node(
        package="robot_api",
        executable="audio_player_signalr.py",
        name="audio_player_node",
        output="screen"
    )
  
   
    ld = LaunchDescription()
    ld.add_action(audio_call)
    ld.add_action(audio_player)

    return ld
    
