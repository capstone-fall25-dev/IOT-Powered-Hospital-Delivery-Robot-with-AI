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
ros2 launch robot_slam slam_launch.py

```

### Launch navigation
```bash
ros2 launch robot_navigation bringup_launch.py

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


