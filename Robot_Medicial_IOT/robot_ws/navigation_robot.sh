#!/bin/bash
# ===========================================================
# 🧭 ROS 2 Navigation Service Setup (Fixed for Jazzy)
# ===========================================================

SERVICE_NAME="navigation"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
USER_NAME="$USER"
WORK_DIR="$HOME/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws"
HOME_DIR="$HOME"

# -----------------------------------------------------------
# 1️⃣  Tạo launcher script điều khiển map parameter
# -----------------------------------------------------------
WRAPPER_SCRIPT="/usr/local/bin/navigation-launcher"
echo "🔧 Tạo navigation launcher script: $WRAPPER_SCRIPT"

sudo bash -c "cat > $WRAPPER_SCRIPT <<'EOL'
#!/bin/bash
# -----------------------------------------------------------
# 🧭 Navigation Launcher with map parameter
# Sử dụng: navigation-launcher [map_name]
# -----------------------------------------------------------

USER_HOME="\$HOME"
WORK_DIR="\$USER_HOME/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws"
DEFAULT_MAP="my_map"

# Lấy tham số map từ command line hoặc environment
MAP_NAME="\${1:-\${MAP_NAME:-\$DEFAULT_MAP}}"

echo "🗺️  Starting Navigation with map: \$MAP_NAME"
MAP_PATH="\$WORK_DIR/src/robot_navigation/map/\$MAP_NAME.yaml"

if [ ! -f "\$MAP_PATH" ]; then
    echo "❌ Map not found: \$MAP_PATH"
    echo "📋 Available maps:"
    ls -1 "\$WORK_DIR/src/robot_navigation/map/"*.yaml 2>/dev/null | xargs -I {} basename {} .yaml
    exit 1
fi

cd "\$WORK_DIR"
source /opt/ros/jazzy/setup.bash
source "\$WORK_DIR/install/setup.bash"

echo "🚀 Launching navigation..."
exec ros2 launch robot_navigation bringup_launch.py map:="\$MAP_PATH"
EOL"

sudo chmod +x $WRAPPER_SCRIPT

# -----------------------------------------------------------
# 2️⃣  Tạo file service systemd
# -----------------------------------------------------------
echo "📄 Tạo file service: $SERVICE_FILE"

sudo bash -c "cat > $SERVICE_FILE <<EOL
[Unit]
Description=ROS 2 Robot Navigation Launch
Requires=robot_driver.service
After=robot_driver.service

[Service]
User=$USER_NAME
WorkingDirectory=$WORK_DIR
Environment=\"ROS_DOMAIN_ID=0\"
Environment=\"ROS_LOG_DIR=/home/$USER_NAME/.ros/log\"
Environment=\"HOME=$HOME_DIR\"
EnvironmentFile=-/etc/default/navigation

# 🚀 Chạy launcher script
ExecStart=$WRAPPER_SCRIPT \$MAP_NAME

# 🧹 Dừng an toàn ROS (Ctrl+C)
ExecStop=/bin/kill -s SIGINT \$MAINPID

# 🔁 Restart khi lỗi
Restart=on-failure
RestartSec=5

# ⚙️ Dừng toàn bộ tiến trình con của ROS2
KillMode=control-group
KillSignal=SIGINT
TimeoutStopSec=10

[Install]
WantedBy=multi-user.target
EOL"

# -----------------------------------------------------------
# 3️⃣  File cấu hình environment
# -----------------------------------------------------------
echo "⚙️  Tạo file cấu hình: /etc/default/navigation"
sudo bash -c "cat > /etc/default/navigation <<EOL
# Navigation service configuration
MAP_NAME=my_map
EOL"

# -----------------------------------------------------------
# 4️⃣  Tạo helper script để restart navigation với map khác
# -----------------------------------------------------------
RESTART_SCRIPT="/usr/local/bin/nav-restart"
echo "🔄 Tạo restart helper script: $RESTART_SCRIPT"

sudo bash -c "cat > $RESTART_SCRIPT <<'EOL'
#!/bin/bash
# -----------------------------------------------------------
# 🔁 Navigation Restart Helper
# Sử dụng: nav-restart [map_name]
# -----------------------------------------------------------

if [ "\$#" -eq 0 ]; then
    echo "❌ Vui lòng chỉ định tên map!"
    echo "📋 Sử dụng: nav-restart <map_name>"
    echo ""
    echo "Available maps:"
    ls -1 "\$HOME/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws/src/robot_navigation/map/"*.yaml 2>/dev/null | xargs -I {} basename {} .yaml
    exit 1
fi

MAP_NAME="\$1"
MAP_PATH="\$HOME/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws/src/robot_navigation/map/\$MAP_NAME.yaml"

if [ ! -f "\$MAP_PATH" ]; then
    echo "❌ Map '\$MAP_NAME' không tồn tại!"
    echo "📁 Path: \$MAP_PATH"
    exit 1
fi

echo "🗺️  Switching to map: \$MAP_NAME"

# Cập nhật environment file
sudo bash -c "echo 'MAP_NAME=\$MAP_NAME' > /etc/default/navigation"

# Restart service
echo "🔄 Restarting navigation service..."
sudo systemctl restart navigation

# Kiểm tra kết quả
sleep 3
if systemctl is-active --quiet navigation; then
    echo "✅ Navigation restarted successfully with \$MAP_NAME"
else
    echo "❌ Failed to restart navigation"
    sudo systemctl status navigation --no-pager -l
fi
EOL"

sudo chmod +x $RESTART_SCRIPT

# -----------------------------------------------------------
# 5️⃣  Reload & enable service
# -----------------------------------------------------------
echo "🔄 Reload systemd daemon..."
sudo systemctl daemon-reexec
sudo systemctl daemon-reload

echo "⚙️ Enable service để chạy khi khởi động..."
sudo systemctl enable $SERVICE_NAME

# -----------------------------------------------------------
# 6️⃣  Hướng dẫn sử dụng
# -----------------------------------------------------------
echo ""
echo "🎉 Setup hoàn tất!"
echo "=================="
echo ""
echo "💡 Cách sử dụng:"
echo ""
echo "1️⃣ Khởi động service:"
echo "   sudo systemctl start navigation"
echo ""
echo "2️⃣ Restart với map mới:"
echo "   nav-restart map_2"
echo ""
echo "3️⃣ Cập nhật thủ công map mặc định:"
echo "   sudo bash -c 'echo \"MAP_NAME=map_2\" > /etc/default/navigation'"
echo "   sudo systemctl restart navigation"
echo ""
echo "4️⃣ Kiểm tra trạng thái:"
echo "   sudo systemctl status navigation"
echo ""
echo "📍 File cấu hình: /etc/default/navigation"
echo "🔧 Script helper:"
echo "   • $WRAPPER_SCRIPT"
echo "   • $RESTART_SCRIPT"
