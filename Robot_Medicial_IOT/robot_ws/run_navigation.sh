#!/bin/bash
# ============================================
# 🚀 Multi-Terminal ROS2 Launcher
# Author: Duong
# Project: IOT-Powered Hospital Delivery Robot
# ============================================

# 🧠 Function to open a new GNOME terminal tab and run a command
launch_in_new_terminal() {
    gnome-terminal -- bash -c "$1; exec bash"
}

echo "🔧 Starting multiple ROS2 packages..."

# 1️⃣ Source your ROS2 workspace and environment
source /opt/ros/jazzy/setup.bash


# 2️⃣ Launch individual components in new terminals
launch_in_new_terminal "ros2 launch robot_driver driver_launch.py"
sleep 2

launch_in_new_terminal "ros2 launch robot_navigation bringup_launch.py"
sleep 5



launch_in_new_terminal "ros2 launch robot_navigation rviz_view_launch.py"
sleep 2

launch_in_new_terminal "ros2 launch robot_api robot_api.launch.py"
sleep 2
echo "✅ All ROS2 nodes launched in separate terminals!"
