#!/bin/bash
# ===========================================================
# 🌐 ROS 2 Robot API Service Setup (Fixed for Jazzy)
# ===========================================================

SERVICE_NAME="robot_api"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
USER_NAME="$USER"
WORK_DIR="$HOME/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws"

echo "🛠️ Tạo file service: $SERVICE_FILE"

# ===========================================================
# 1️⃣ Tạo file systemd service
# ===========================================================
sudo bash -c "cat > $SERVICE_FILE <<EOL
[Unit]
Description=ROS 2 Robot API Launch
After=network.target

[Service]
User=$USER_NAME
WorkingDirectory=$WORK_DIR
Environment=\"ROS_DOMAIN_ID=0\"
Environment=\"ROS_LOG_DIR=/home/$USER_NAME/.ros/log\"

# 🧠 Lệnh khởi động ROS2 API
ExecStart=/bin/bash -i -c 'source /opt/ros/jazzy/setup.bash && \
                           source $WORK_DIR/install/setup.bash && \
                           ros2 launch robot_api robot_api.launch.py'

# 🧹 Lệnh dừng an toàn (Ctrl+C)
ExecStop=/bin/kill -s SIGINT \$MAINPID

# 🔁 Tự động restart khi gặp lỗi
Restart=on-failure
RestartSec=5

# ⚙️ Đảm bảo kill toàn bộ tiến trình ROS2 (kể cả node con)
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
sudo systemctl enable $SERVICE_NAME

# ===========================================================
# 3️⃣ Hướng dẫn sử dụng
# ===========================================================
echo "✅ Service $SERVICE_NAME đã tạo và bật auto-start thành công!"
echo "▶️ Chạy ngay: sudo systemctl start $SERVICE_NAME"
echo "⏹️ Dừng: sudo systemctl stop $SERVICE_NAME"
echo "🔍 Kiểm tra trạng thái: sudo systemctl status $SERVICE_NAME"
echo "📜 Xem log realtime: journalctl -u $SERVICE_NAME -f"
