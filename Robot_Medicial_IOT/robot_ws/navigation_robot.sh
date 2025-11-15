#!/bin/bash
# ===========================================================
# ROS 2 Navigation Service Setup (Fixed for Jazzy - FINAL)
# ===========================================================

SERVICE_NAME="navigation"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
USER_NAME="$USER"
WORK_DIR="$HOME/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws"
HOME_DIR="$HOME"

# -----------------------------------------------------------
# 1. Tạo launcher script điều khiển map parameter
# -----------------------------------------------------------
WRAPPER_SCRIPT="/usr/local/bin/navigation-launcher"
echo "Creating navigation launcher script: $WRAPPER_SCRIPT"

sudo bash -c "cat > $WRAPPER_SCRIPT <<'EOL'
#!/bin/bash
# -----------------------------------------------------------
# Navigation Launcher with map parameter
# Sử dụng: navigation-launcher [map_name]
# -----------------------------------------------------------

USER_HOME=\"\$HOME\"
WORK_DIR=\"\$USER_HOME/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws\"
DEFAULT_MAP=\"my_map\"

# Lấy tham số map từ command line hoặc environment
MAP_NAME=\"\${1:-\${MAP_NAME:-\$DEFAULT_MAP}}\"

echo \"Starting Navigation with map: \$MAP_NAME\"
MAP_PATH=\"\$WORK_DIR/src/robot_navigation/map/\$MAP_NAME.yaml\"

if [ ! -f \"\$MAP_PATH\" ]; then
    echo \"Map not found: \$MAP_PATH\"
    echo \"Available maps:\"
    ls -1 \"\$WORK_DIR/src/robot_navigation/map/\"*.yaml 2>/dev/null | sed 's/\\.yaml\$//' | sed 's|.*/||' | sort
    exit 1
fi

cd \"\$WORK_DIR\" || exit 1
source /opt/ros/jazzy/setup.bash
source \"\$WORK_DIR/install/setup.bash\"

echo \"Launching navigation with map: \$MAP_PATH\"

# exec thay thế process → systemd theo dõi đúng MAINPID
exec ros2 launch robot_navigation bringup_launch.py map:=\"\$MAP_PATH\"
EOL"

sudo chmod +x "$WRAPPER_SCRIPT"

# -----------------------------------------------------------
# 2. Tạo file service systemd (ĐÃ SỬA ĐÚNG BIẾN + EXEC + KILL)
# -----------------------------------------------------------
echo "Creating service file: $SERVICE_FILE"

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

# DÙNG BIẾN ĐÃ ĐỌC TỪ FILE → ĐÚNG CÚ PHÁP
ExecStart=$WRAPPER_SCRIPT \${MAP_NAME}

# Dừng an toàn bằng SIGINT → gửi cho toàn bộ control group
ExecStop=/bin/kill -SIGINT \$MAINPID
ExecStopPost=/bin/sleep 2

# Tự động restart khi lỗi
Restart=on-failure
RestartSec=5

# ĐẢM BẢO GIẾT TOÀN BỘ NHÓM TIẾN TRÌNH
KillMode=control-group
SendSIGKILL=yes
TimeoutStopSec=15
TimeoutStartSec=30

[Install]
WantedBy=multi-user.target
EOL"

# -----------------------------------------------------------
# 3. File cấu hình environment
# -----------------------------------------------------------
echo "Creating config file: /etc/default/navigation"
sudo bash -c "cat > /etc/default/navigation <<EOL
# Navigation service configuration
MAP_NAME=abc
EOL"

# -----------------------------------------------------------
# 4. Tạo helper script để restart navigation với map khác
# -----------------------------------------------------------
RESTART_SCRIPT="/usr/local/bin/nav-restart"
echo "Creating restart helper script: $RESTART_SCRIPT"

sudo bash -c "cat > $RESTART_SCRIPT <<'EOL'
#!/bin/bash
# -----------------------------------------------------------
# Navigation Restart Helper
# Sử dụng: nav-restart [map_name]
# -----------------------------------------------------------

if [ \"\$#\" -eq 0 ]; then
    echo \"Vui lòng chỉ định tên map!\"
    echo \"Sử dụng: nav-restart <map_name>\"
    echo \"\"
    echo \"Available maps:\"
    ls -1 \"\$HOME/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws/src/robot_navigation/map/\"*.yaml 2>/dev/null | sed 's/\\.yaml\$//' | sed 's|.*/||' | sort
    exit 1
fi

MAP_NAME=\"\$1\"
MAP_PATH=\"\$HOME/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws/src/robot_navigation/map/\$MAP_NAME.yaml\"

if [ ! -f \"\$MAP_PATH\" ]; then
    echo \"Map '\$MAP_NAME' không tồn tại!\"
    echo \"Path: \$MAP_PATH\"
    exit 1
fi

echo \"Switching to map: \$MAP_NAME\"

# Cập nhật environment file
sudo bash -c \"echo 'MAP_NAME=\$MAP_NAME' > /etc/default/navigation\"

# Restart service
echo \"Restarting navigation service...\"
sudo systemctl restart navigation

# Kiểm tra kết quả
sleep 3
if systemctl is-active --quiet navigation; then
    echo \"Navigation restarted successfully with \$MAP_NAME\"
else
    echo \"Failed to restart navigation\"
    sudo systemctl status navigation --no-pager -l
fi
EOL"

sudo chmod +x "$RESTART_SCRIPT"

# -----------------------------------------------------------
# 5. Reload & enable service
# -----------------------------------------------------------
echo "Reloading systemd daemon..."
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl reset-failed "$SERVICE_NAME" 2>/dev/null || true

echo "Service ready. Use 'sudo systemctl start navigation' to run."

# -----------------------------------------------------------
# 6. Hướng dẫn sử dụng
# -----------------------------------------------------------
echo ""
echo "Setup hoàn tất!"
echo "=================="
echo ""
echo "Cách sử dụng:"
echo ""
echo "1. Khởi động service:"
echo "   sudo systemctl start navigation"
echo ""
echo "2. Restart với map mới:"
echo "   nav-restart map_2"
echo ""
echo "3. Cập nhật thủ công map mặc định:"
echo "   sudo bash -c 'echo \"MAP_NAME=map_2\" > /etc/default/navigation'"
echo "   sudo systemctl restart navigation"
echo ""
echo "4. Kiểm tra trạng thái:"
echo "   sudo systemctl status navigation"
echo "   journalctl -u navigation -f"
echo ""
echo "File cấu hình: /etc/default/navigation"
echo "Script helper:"
echo "   • $WRAPPER_SCRIPT"
echo "   • $RESTART_SCRIPT"
echo ""
echo "Lưu ý: Dùng 'exec' trong launcher → systemd theo dõi đúng tiến trình!"