#!/usr/bin/env python3
import asyncio
import json
import threading
import subprocess
import rclpy
from rclpy.node import Node
import requests
import yaml
import base64
import os
import time
from signalrcore.hub_connection_builder import HubConnectionBuilder
from get_api_url import get_api

BASE_URL = get_api()
# 🌐 Hub backend ASP.NET
HUB_URL = f"{BASE_URL}/hubs/robotposition"

# 🌐 REST API upload map
MAP_API_URL = f"{BASE_URL}/api/MapsUpload/json"

# 🗺️ Map folder path
MAP_FOLDER = os.path.expanduser(
    "~/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws/src/robot_navigation/map"
)


# ==========================================================
# 🔧 Helper function: Upload map to backend
# ==========================================================
def upload_map_to_api(yaml_path, pgm_path):
    try:
        with open(yaml_path, "r") as file:
            map_data = yaml.safe_load(file)

        with open(pgm_path, "rb") as image_file:
            encoded_image = base64.b64encode(image_file.read()).decode("utf-8")

        map_json = {
            "MapName": os.path.basename(yaml_path).replace(".yaml", ""),
            "Mode": map_data.get("mode", "trinary"),
            "Resolution": float(map_data.get("resolution", 0.05)),
            "OriginX": float(map_data.get("origin", [0, 0, 0])[0]),
            "OriginY": float(map_data.get("origin", [0, 0, 0])[1]),
            "OriginZ": float(map_data.get("origin", [0, 0, 0])[2]),
            "OccupiedThresh": float(map_data.get("occupied_thresh", 0.65)),
            "FreeThresh": float(map_data.get("free_thresh", 0.25)),
            "Negate": bool(map_data.get("negate", 0)),
            "ImageName": os.path.basename(pgm_path),
            "ImageBase64": encoded_image,
        }

        print(f"📡 Uploading map '{map_json['MapName']}' to API: {MAP_API_URL}")
        response = requests.post(MAP_API_URL, json=map_json)

        if response.status_code in [200, 201]:
            print(f"✅ Upload successful: {response.text}")
        else:
            print(f"❌ Upload failed [{response.status_code}]: {response.text}")

    except Exception as e:
        print(f"⚠️ Error uploading map: {e}")


# ==========================================================
# 🔧 Helper: Restart STM32 service
# ==========================================================
def restart_stm32():
    try:
        print("🔄 Restarting stm32.service...")
        subprocess.run(["bash", "-c", "sudo systemctl restart robot_driver.service"], check=False)
        time.sleep(2)
    except Exception as e:
        print(f"⚠️ Error restarting stm32: {e}")

def stop_slam():
    try:
        print("🔄 Stop slam_launch.service...")
        subprocess.run(["bash", "-c", "sudo systemctl stop slam_launch.service"], check=False)
        time.sleep(2)
    except Exception as e:
        print(f"⚠️ Error restarting stm32: {e}")



# ==========================================================
# 🔧 Helper: Restart navigation service
# ==========================================================
def restart_navigation(map_name):
    try:
        print(f"🚀 Restarting navigation with map '{map_name}'...")
        subprocess.run(["bash", "-c", f"nav-restart {map_name}"], check=False)
    except Exception as e:
        print(f"⚠️ Error restarting navigation: {e}")


# ==========================================================
# 🌐 Main ROS2 Node
# ==========================================================
class MapSignalSubscriber(Node):
    def __init__(self):
        super().__init__("map_signal_subscriber")
        self.get_logger().info("🚀 ROS2 Node - Map SignalR Listener started")

        # Event loop riêng cho SignalR
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self.loop.create_task(self.start_signalr_listener())

        # Chạy song song với ROS2 spin
        threading.Thread(target=self.loop.run_forever, daemon=True).start()

    # ======================================================
    # 🔔 SignalR listener setup
    # ======================================================
    async def start_signalr_listener(self):
        try:
            self.get_logger().info(f"🔗 Connecting to SignalR Hub at {HUB_URL}...")

            self.hub_connection = (
                HubConnectionBuilder()
                .with_url(HUB_URL)
                .with_automatic_reconnect(
                    {"type": "raw", "keep_alive_interval": 10, "reconnect_interval": 5}
                )
                .build()
            )

            # ======================================================
            # 🎧 Event handler: ReceiveRobotCommand
            # ======================================================
            def on_receive_robot_command(args):
                try:
                    data = args[0] if args else {}
                    mode = data.get("mode", "").lower()
                    map_name = data.get("map_name", "map_default")

                    print(f"\n🤖 Received Robot Command → mode={mode}, map={map_name}")
                    restart_stm32()
                    # ========== MAPPING MODE ==========
                    if mode == "mapping":
                        print("🧭 Starting SLAM (Mapping mode)")
                        restart_stm32()
                        subprocess.run(
                            [
                                "bash",
                                "-c",
                                "sudo systemctl stop navigation && sudo systemctl restart slam_launch.service",
                            ],
                            check=False,
                        )

                    # ========== SAVE MAP MODE ==========
                    elif mode == "save_map":
                        print(f"💾 Saving map '{map_name}'...")

                        yaml_path = os.path.join(MAP_FOLDER, f"{map_name}.yaml")
                        pgm_path = os.path.join(MAP_FOLDER, f"{map_name}.pgm")

                        # Xóa map cũ nếu tồn tại
                        for f in [yaml_path, pgm_path]:
                            if os.path.exists(f):
                                os.remove(f)


                        # Gọi map_saver
                        cmd = f"ros2 run nav2_map_server map_saver_cli -f {MAP_FOLDER}/{map_name}"
                        print(f"🧭 Running: {cmd}")
                        subprocess.run(["bash", "-c", cmd], check=False)

                        # Chờ file xuất hiện
                        timeout = 15
                        while timeout > 0 and not (
                            os.path.exists(yaml_path) and os.path.exists(pgm_path)
                        ):
                            time.sleep(1)
                            timeout -= 1

                        if not os.path.exists(yaml_path) or not os.path.exists(pgm_path):
                            print("⚠️ Map save failed or timed out.")
                            return

                        print("✅ Map saved successfully. Uploading to API...")
                        upload_map_to_api(yaml_path, pgm_path)

                        # Stop SLAM và khởi động lại navigation
                        print("🛑 Stopping SLAM and restarting navigation...")
                        subprocess.run(
                            ["bash", "-c", "sudo systemctl stop slam_launch.service"],
                            check=False,
                        )
                        # restart_stm32()
                        # restart_navigation(map_name)
                        print(f"🗺️ Map '{map_name}' loaded successfully!")

                    # ========== RUN MAP MODE ==========
                    elif mode == "run_map":
                        print(f"🗺️ Running navigation on map '{map_name}'...")
                        restart_stm32()
                        stop_slam()
                        restart_navigation(map_name)

                    else:
                        print(f"⚠️ Unknown mode received: {mode}")

                except Exception as e:
                    print(f"⚠️ Error processing command: {e}")

            # ======================================================
            # 🔔 Register SignalR event
            # ======================================================
            self.hub_connection.on("ReceiveRobotCommand", on_receive_robot_command)

            self.hub_connection.on_open(lambda: print("✅ Connected to SignalR Hub!"))
            self.hub_connection.on_close(lambda: print("❌ Connection closed"))
            self.hub_connection.on_error(lambda err: print(f"⚠️ SignalR Error: {err}"))

            # Start connection
            self.hub_connection.start()

        except Exception as e:
            self.get_logger().error(f"❌ Failed to connect to SignalR: {e}")


# ==========================================================
# 🚀 MAIN ENTRY
# ==========================================================
def main(args=None):
    rclpy.init(args=args)
    node = MapSignalSubscriber()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        print("🛑 Interrupted by user")
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
