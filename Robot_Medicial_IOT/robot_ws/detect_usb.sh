#!/bin/bash
# =============================================
# 🚀 Auto create udev rules for LIDAR (CP2102) & STM32 (CH340)
# Creates symbolic links:
#   /dev/lidar_uart  → CP2102
#   /dev/stm32_uart  → CH340
# Author: La Tung Duong
# =============================================

RULES_FILE="/etc/udev/rules.d/99-robot-uart.rules"

echo "🔧 Creating udev rules for CP2102 (LIDAR) and CH340 (STM32)..."

sudo bash -c "cat > $RULES_FILE" <<'EOF'
# =============================================
# 🚀 Hospital Delivery Robot UART Rules
# =============================================

# LIDAR (CP2102)
SUBSYSTEM=="tty", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", SYMLINK+="lidar_uart", MODE="0666"

# STM32 (CH340)
SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", SYMLINK+="stm32_uart", MODE="0666"
EOF

# Reload udev rules
echo "♻️ Reloading udev rules..."
sudo udevadm control --reload-rules
sudo udevadm trigger

echo "✅ Done!"
echo "📡 Checking detected serial devices..."
ls -l /dev/ttyUSB* /dev/lidar_uart /dev/stm32_uart 2>/dev/null || echo "No devices detected yet."

echo "🔄 Please (re)plug your LIDAR and STM32 USB cables to apply the new udev mapping."
