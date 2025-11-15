#!/bin/bash
# ============================================
# 🚀 Restart Robot Services Script
# Author : 
# Date   : $(date +"%d-%m-%Y")
# ============================================

# Danh sách service cần restart
SERVICES=(
  robot_driver
  robot_api
  navigation
  slam_launch
)

echo "🔁 Stop robot services..."
echo "----------------------------------"

# Vòng lặp restart từng service
for s in "${SERVICES[@]}"; do
  echo "➡️ Stop $s ..."
  sudo systemctl stop $s

  # Kiểm tra trạng thái
  if systemctl is-active --quiet $s; then
    echo "✅ $s stop successfully."
  else
    echo "❌ Failed to restart $s."
  fi
  echo "----------------------------------"
done

echo "🎯 All services processed!"
# "EOF