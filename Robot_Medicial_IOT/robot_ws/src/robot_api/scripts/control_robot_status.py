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
# ⚙️ CONFIG
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
# ⚙️ SYSTEMD CONTROL
# ============================================================
def run_cmd(cmd: str):
    print(f"⚙️ Running: {cmd}")
    result = subprocess.run(cmd, shell=True, text=True,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE)
    if result.returncode == 0:
        print(f"✅ Done: {cmd}")
    else:
        print(f"❌ Error: {result.stderr.strip()}")
    return result.returncode == 0


def control_services(power_on: bool):
    if power_on:
        print("🚀 Starting robot services...")
        for s in SERVICES:
            run_cmd(f"sudo systemctl restart {s}")
    else:
        print("🛑 Stopping robot services...")
        for s in SERVICES:
            run_cmd(f"sudo systemctl stop {s}")


def report_power_state(power_on: bool):
    try:
        data = {"power": power_on, "source": ROBOT_NAME}
        resp = requests.post(f"{BACKEND_URL}/api/RobotPower/report",
                             json=data, timeout=5)
        if resp.status_code == 200:
            print(f"📡 Reported to backend: {data}")
        else:
            print(f"⚠️ Report failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Report error: {e}")


# ============================================================
# 🧠 ROBOT POWER LISTENER — WITH AUTO RECONNECT
# ============================================================
class RobotPowerListener(Node):
    def __init__(self):
        super().__init__('robot_power_listener')
        self.get_logger().info("🤖 Robot Power Listener started")

        # Tạo event-loop riêng để chạy SignalR
        self.loop = asyncio.new_event_loop()
        threading.Thread(target=self.loop.run_forever,
                         daemon=True).start()

        # Bắt đầu auto-reconnect
        asyncio.run_coroutine_threadsafe(
            self.signalr_connect_loop(),
            self.loop
        )

    # ============================================================
    # 🔁 AUTO RECONNECT LOOP
    # ============================================================
    async def signalr_connect_loop(self):
        while True:
            try:
                await self.start_signalr_once()
                print("🔄 Waiting for disconnect event...")
                await self.wait_for_disconnect()

            except Exception as e:
                print(f"⚠️ SignalR loop error: {e}")

            print("🔁 Reconnecting hub in 5 seconds…")
            await asyncio.sleep(5)

    async def wait_for_disconnect(self):
        """Chặn cho đến khi hub bị ngắt kết nối"""
        while True:
            if not self.hub_connection.connected:
                print("❌ Hub disconnected!")
                return
            await asyncio.sleep(1)

    # ============================================================
    # 🔌 KẾT NỐI MỘT LẦN
    # ============================================================
    async def start_signalr_once(self):
        print(f"🔌 Connecting to SignalR Hub at {HUB_URL}...")

        self.hub_connection = (
            HubConnectionBuilder()
            .with_url(HUB_URL)
            .with_automatic_reconnect({
                "type": "interval",
                "keep_alive_interval": 10,
                "reconnect_interval": 5
            })
            .build()
        )

        # ======================================================
        # 🎧 CALLBACKS
        # ======================================================
        def on_receive_robot_power(args):
            try:
                data = args[0] if args else {}
                print("\n⚡ Received Robot Power Command:\n",
                      json.dumps(data, indent=2, ensure_ascii=False))

                state = data.get("state", "")
                power_on = (state == "on")

                control_services(power_on)
                report_power_state(power_on)

                print(f"✅ Robot power changed → {'🟢 ON' if power_on else '🔴 OFF'}")

            except Exception as e:
                print(f"❌ Error processing power command: {e}")

        def on_receive_robot_command(args):
            print("\n🤖 Robot Command Received:")
            print(json.dumps(args, indent=2, ensure_ascii=False))

        # Register events (ensure no duplication)
        self.hub_connection.handlers.clear()
        self.hub_connection.on("ReceiveRobotPower", on_receive_robot_power)
        self.hub_connection.on("ReceiveRobotCommand", on_receive_robot_command)

        self.hub_connection.on_open(lambda: print("✅ Connected to Hub"))
        self.hub_connection.on_close(lambda: print("❌ Connection closed"))
        self.hub_connection.on_error(lambda err: print(f"⚠️ Hub error: {err}"))

        # Start connection
        self.hub_connection.start()

        if not self.hub_connection.connected:
            raise Exception("❌ Failed to connect hub!")

        print("🎉 Hub started successfully")



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
