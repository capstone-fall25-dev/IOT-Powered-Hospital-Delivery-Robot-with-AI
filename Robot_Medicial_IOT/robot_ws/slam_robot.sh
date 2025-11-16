#!/bin/bash
# ===========================================================
# 🗺️ ROS 2 SLAM Service Setup (Fixed for Jazzy)
# ===========================================================

SERVICE_NAME="slam_launch"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
USER_NAME="$USER"
WORK_DIR="$HOME/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws"

echo "🛠️ Tạo file service: $SERVICE_FILE"

# ===========================================================
# 1️⃣ Tạo file systemd service
# ===========================================================
sudo bash -c "cat > $SERVICE_FILE <<EOL
[Unit]
Description=ROS 2 Robot SLAM Launch
After=network.target

[Service]
User=$USER_NAME
WorkingDirectory=$WORK_DIR
Environment=\"ROS_DOMAIN_ID=0\"
Environment=\"ROS_LOG_DIR=/home/$USER_NAME/.ros/log\"

# 🚀 Khởi động SLAM
ExecStart=/bin/bash -i -c 'source /opt/ros/jazzy/setup.bash && \
                           source $WORK_DIR/install/setup.bash && \
                           ros2 launch robot_slam slam_launch.py'

# 🧹 Dừng an toàn ROS (Ctrl+C)
ExecStop=/bin/kill -s SIGINT \$MAINPID

# 🔁 Tự động restart khi gặp lỗi
Restart=on-failure
RestartSec=5

# ⚙️ Đảm bảo kill toàn bộ tiến trình ROS2 con
KillMode=control-group
KillSignal=SIGINT
TimeoutStopSec=10

[Install]
WantedBy=multi-user.target
EOL"

# ===========================================================
# 2️⃣ Reload và enable service
# ===========================================================
echo "🔄 Reload systemd daemon..."
sudo systemctl daemon-reexec
sudo systemctl daemon-reload

echo "⚙️ Bật auto-start khi khởi động..."
# sudo systemctl enable $SERVICE_NAME

# ===========================================================
# 3️⃣ Hướng dẫn sử dụng
# ===========================================================
echo ""
echo "🎉 Service $SERVICE_NAME đã tạo và bật auto-start thành công!"
echo "=============================================="
echo ""
echo "▶️  Khởi động ngay: sudo systemctl start $SERVICE_NAME"
echo "⏹️  Dừng:           sudo systemctl stop $SERVICE_NAME"
echo "🔍  Trạng thái:     sudo systemctl status $SERVICE_NAME"
echo "📜  Xem log live:   journalctl -u $SERVICE_NAME -f"
echo ""
