#!/usr/bin/env python3
import os
import subprocess
import asyncio
import json
import threading
import rclpy
from rclpy.node import Node
from signalrcore.hub_connection_builder import HubConnectionBuilder
import requests
from get_api_url import get_api

# ============================================================
# ⚙️ CẤU HÌNH
# ============================================================
BACKEND_URL = get_api()
HUB_URL = f"{BACKEND_URL}/hubs/robot"
ROBOT_NAME = "RobotA"

SERVICES = [
    "robot_driver.service",
    "robot_api.service",
    "navigation.service"
]


# ============================================================
# ⚙️ HÀM HỖ TRỢ
# ============================================================
def run_cmd(cmd: str):
    """Chạy lệnh bash (systemctl)"""
    print(f"⚙️  Running: {cmd}")
    result = subprocess.run(
        cmd, shell=True, text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    if result.returncode == 0:
        print(f"✅ Done: {cmd}")
    else:
        print(f"❌ Error: {result.stderr.strip()}")
    return result.returncode == 0


def control_services(power_on: bool):
    """Bật hoặc tắt các service robot"""
    if power_on:
        print("🚀 Starting robot services...")
        for s in SERVICES:
            run_cmd(f"sudo systemctl restart {s}")
    else:
        print("🛑 Stopping robot services...")
        for s in SERVICES:
            run_cmd(f"sudo systemctl stop {s}")


def report_power_state(power_on: bool):
    """Gửi phản hồi lại backend sau khi xử lý xong"""
    try:
        data = {
            "power": power_on,
            "source": ROBOT_NAME
        }
        resp = requests.post(f"{BACKEND_URL}/api/RobotPower/report", json=data, timeout=5)
        if resp.status_code == 200:
            print(f"📡 Reported to backend: {data}")
        else:
            print(f"⚠️ Report failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Report error: {e}")


# ============================================================
# 🧠 ROS2 Node — Power Listener
# ============================================================
class RobotPowerListener(Node):
    def __init__(self):
        super().__init__('robot_power_listener')
        self.get_logger().info("🤖 ROS2 Node - Robot Power Listener started")

        # Khởi tạo event loop riêng cho SignalR
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self.loop.create_task(self.start_signalr_listener())

        # Chạy event loop trong thread riêng
        threading.Thread(target=self.loop.run_forever, daemon=True).start()

    # ============================================================
    # 🔗 Kết nối SignalR và lắng nghe sự kiện
    # ============================================================
    async def start_signalr_listener(self):
        try:
            self.get_logger().info(f"🔌 Connecting to SignalR Hub at {HUB_URL}...")

            self.hub_connection = (
                HubConnectionBuilder()
                .with_url(HUB_URL)
                .with_automatic_reconnect({
                    "type": "raw",
                    "keep_alive_interval": 10,
                    "reconnect_interval": 5
                })
                .build()
            )

            # 🎧 Nhận sự kiện bật/tắt nguồn robot
            def on_receive_robot_power(args):
                try:
                    data = args[0] if args else {}
                    print("\n⚡ Received Robot Power Command:")
                    print(json.dumps(data, indent=2, ensure_ascii=False))

                    state = data.get("state", "")
                    power_on = (state == "on")

                    control_services(power_on)
                    report_power_state(power_on)

                    text = "🟢 ON" if power_on else "🔴 OFF"
                    print(f"✅ Robot power changed → {text}")

                except Exception as e:
                    print(f"⚠️ Error processing command: {e}")

            # 🎧 Nhận sự kiện lệnh điều khiển robot khác (nếu cần)
            def on_receive_robot_command(args):
                try:
                    cmd = args[0] if args else {}
                    print("\n🤖 Received Robot Command:")
                    print(json.dumps(cmd, indent=2, ensure_ascii=False))
                except Exception as e:
                    print(f"⚠️ Error in RobotCommand: {e}")

            # Đăng ký sự kiện SignalR
            self.hub_connection.on("ReceiveRobotPower", on_receive_robot_power)
            self.hub_connection.on("ReceiveRobotCommand", on_receive_robot_command)

            # Các sự kiện kết nối
            self.hub_connection.on_open(lambda: print("✅ Connected to SignalR Hub!"))
            self.hub_connection.on_close(lambda: print("❌ Connection closed"))
            self.hub_connection.on_error(lambda err: print(f"⚠️ Connection error: {err}"))

            # Kết nối
            self.hub_connection.start()
        except Exception as e:
            self.get_logger().error(f"❌ Failed to connect SignalR: {e}")


# ============================================================
# 🚀 MAIN
# ============================================================
def main(args=None):
    rclpy.init(args=args)
    node = RobotPowerListener()

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        print("🛑 Interrupted by user.")
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
