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
)

echo "🔁 Restarting robot services..."
echo "----------------------------------"

# Vòng lặp restart từng service
for s in "${SERVICES[@]}"; do
  echo "➡️ Restarting $s ..."
  sudo systemctl restart $s

  # Kiểm tra trạng thái
  if systemctl is-active --quiet $s; then
    echo "✅ $s restarted successfully."
  else
    echo "❌ Failed to restart $s."
  fi
  echo "----------------------------------"
done

echo "🎯 All services processed!"
