### Build and create package

```bash
mkdir -p ~/robot_ws/src
cd ~/robot_ws/
colcon build
```

### Create a package

```bash
cd ~/robot_ws/src
ros2 pkg create name_of_package --build-type ament_cmake --dependencies std_msgs sensor_msgs

```

### Connet to stm32 and use lidar

```bash
ros2 launch robot_driver robot_driver driver_launch.py

```

### Launch slam

```bash
ros2 launch robot_driver  driver_launch.py

ros2 launch robot_slam slam_launch.py


ros2 launch robot_navigation rviz_view_launch.py (xem map)

ros2 run robot_driver teleop.py (dieu khien)

ros2 run nav2_map_server map_saver_cli -f <tên_bản_đồ> (luu o thu muc hien tai cua terminal)

```

### Launch navigation
```bash
ros2 launch robot_navigation bringup_launch.py

ros2 launch robot_driver  driver_launch.py

ros2 launch robot_navigation rviz_view_launch.py (xem map)
```
### launch API
```
ros2 launch robot_api launch_test.py
```

```

### Test lidar

```bash
ros2 launch rplidar_ros view_rplidar_a2m8_launch.py
```

### Test map 

```bash
ros2 launch robot_navigation test_map_launch.py
```

### Run websocket
```bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml address:=0.0.0.0 port:=9000
```

ros-web-bridge
receive topic map from ros with websocket ip/port and render map with html css and js
usb TTL convert from usb to uart to connect between computer and stm32




# 🚀 Robot Service Restart Guide (Ubuntu)

Tài liệu này hướng dẫn cách **khởi động lại (restart)** các dịch vụ ROS trên Ubuntu.

## 📦 Danh sách dịch vụ
Các dịch vụ đang được cấu hình trong hệ thống:
- **robot_driver** — điều khiển phần cứng, động cơ, cảm biến
- **robot_api** — cung cấp REST API hoặc WebSocket cho giao tiếp bên ngoài
- **navigation** — chạy ROS navigation stack (move_base, map_server, v.v.)
- **slam_launch** — chạy SLAM (GMapping, Hector SLAM, hoặc RTAB-Map)

---

## ⚙️ 1. Kiểm tra trạng thái dịch vụ

```bash
sudo systemctl status robot_driver.service
sudo systemctl status robot_api.service
sudo systemctl status navigation.service
sudo systemctl status slam_launch.service
```
## 🔁 2. Khởi động  dịch vụ
```bash
sudo systemctl restart robot_driver
sudo systemctl restart robot_api
sudo systemctl restart navigation
sudo systemctl restart slam_launch
```

## 🧹 3. Dừng tất cả dịch vụ
```bash
sudo systemctl stop robot_driver
sudo systemctl stop navigation
sudo systemctl stop slam_launch
sudo systemctl stop robot_api

```

## ▶️ 4. Khởi động tất cả dịch vụ
```bash
sudo systemctl start robot_driver
sudo systemctl start robot_api
sudo systemctl start navigation
sudo systemctl start slam_launch

```
## 🔍 5. Xem log của từng service
```bash
sudo journalctl -u robot_driver -f
sudo journalctl -u robot_api -f
sudo journalctl -u navigation -f
sudo journalctl -u slam_launch -f
sudo systemctl status robot_api
```

## 6 When open computer run 
```bash
chmod +x restart_service.sh
./restart_service.sh

./stop_all.sh
```


## simulation
ros2 launch turtlebot3_gazebo turtlebot3_world.launch.py
ros2 launch turtlebot3_navigation2 navigation2.launch.py use_sim_time:=True


## check point
ros2 topic echo /clicked_point 

## run map on rviz
```bash

ros2 launch turtlebot3_navigation2 navigation2.launch.py use_sim_time:=True map:=/home/tungduong/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws/src/robot_navigation/map/my_map_.yaml


```
## run map 
nav-restart duong12
