#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from nav_msgs.msg import OccupancyGrid
import base64
import numpy as np
import time
import threading
import requests
from signalrcore.hub_connection_builder import HubConnectionBuilder
from rclpy.qos import ReliabilityPolicy, DurabilityPolicy, QoSProfile
from PIL import Image
import io
from get_api_url import get_api
BASE_URL = get_api()

class MapSignalRStreamer(Node):
    def __init__(self):
        super().__init__('map_signalr_streamer')

        # =========================
        # 🔧 CONFIG
        # =========================
        self.api_url = f"{BASE_URL}/api/RobotMode/map-update"
        self.hub_url = f"{BASE_URL}/hubs/robotposition"
        self.send_interval_sec = 1.0           # send every 1 second
        self.http_timeout_sec = 5
        self.max_retry = 2
        self.current_mode = "idle"
        self.latest_map = None                 # cache latest map message
        self.stop_flag = False

        # =========================
        # 🔗 SignalR connection
        # =========================
        self.hub = None
        self.start_signalr_connection()

        # =========================
        # 📡 ROS2: subscribe /map
        # =========================
        qos_profile = QoSProfile(
            reliability=ReliabilityPolicy.RELIABLE,
            durability=DurabilityPolicy.TRANSIENT_LOCAL,
            depth=10
        )

        self.subscription = self.create_subscription(
            OccupancyGrid,
            '/map',
            self.map_callback,
            qos_profile
        )

        # =========================
        # ⏱️ Background sender thread
        # =========================
        threading.Thread(target=self.map_sender_loop, daemon=True).start()

        self.get_logger().info(f"🌐 Map streamer initialized. API={self.api_url} HUB={self.hub_url}")

    # ------------------------------------------------------
    # SignalR connect + handlers
    # ------------------------------------------------------
    def start_signalr_connection(self):
        def run():
            try:
                self.get_logger().info(f"🔗 Connecting to SignalR Hub at {self.hub_url}")

                self.hub = (
                    HubConnectionBuilder()
                    .with_url(self.hub_url)
                    .with_automatic_reconnect({
                        "type": "raw",
                        "keep_alive_interval": 10,
                        "reconnect_interval": 5
                    })
                    .build()
                )

                self.hub.on("ReceiveRobotCommand", self.handle_robot_command)
                self.hub.start()
                self.get_logger().info("🟢 Connected to SignalR Hub successfully!")
            except Exception as e:
                self.get_logger().error(f"❌ Failed to connect to Hub: {e}")
                self.hub = None

        threading.Thread(target=run, daemon=True).start()

    def handle_robot_command(self, command):
        try:
            self.get_logger().info(f"📩 Command from hub: {command}")
            mode = None
            if isinstance(command, dict):
                mode = command.get("mode")
            elif isinstance(command, list) and command:
                item = command[0]
                if isinstance(item, dict):
                    mode = item.get("mode")
            if mode:
                self.current_mode = mode
                self.get_logger().info(f"🔄 Current mode set to: {self.current_mode}")
        except Exception as e:
            self.get_logger().warn(f"⚠️ Failed to process hub command: {e}")

    # ------------------------------------------------------
    # ROS2 /map callback (cache only)
    # ------------------------------------------------------
    def map_callback(self, msg: OccupancyGrid):
        """Store latest map (no sending here)."""
        self.latest_map = msg

    # ------------------------------------------------------
    # ⏱️ Background sender loop (runs every 1s)
    # ------------------------------------------------------
    def map_sender_loop(self):
        while not self.stop_flag:
            if self.latest_map:
                self.send_latest_map()
            time.sleep(self.send_interval_sec)

    # ------------------------------------------------------
    # 🛰️ Send map via REST
    # ------------------------------------------------------
    # from PIL import Image

    def send_latest_map(self):
        try:
            msg = self.latest_map
            width = int(msg.info.width)
            height = int(msg.info.height)
            res = float(msg.info.resolution)
            ox = float(msg.info.origin.position.x)
            oy = float(msg.info.origin.position.y)
            oz = float(msg.info.origin.position.z)

            # === Convert ROS occupancy grid [-1,0,100] -> grayscale (0–255) ===
            grid = np.asarray(msg.data, dtype=np.int8).reshape(height, width)
            img_array = np.zeros_like(grid, dtype=np.uint8)

            # occupied -> black
            img_array[grid == 100] = 0
            # free -> white
            img_array[grid == 0] = 255
            # unknown -> gray
            img_array[grid == -1] = 128

            # === Flip Y (ROS origin bottom-left) ===
            img_array = np.flipud(img_array)

            # === Convert to PNG base64 ===
            img = Image.fromarray(img_array, mode="L")
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            map_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

            payload = {
                "Type": "map_update",
                "Timestamp": int(time.time() * 1000),
                "Resolution": res,
                "Width": width,
                "Height": height,
                "Origin": {"X": ox, "Y": oy, "Z": oz},
                "Data_b64": map_b64,
            }

            self.get_logger().info(f"🗺️ Sending corrected map {width}×{height}")
            resp = requests.post(self.api_url, json=payload, timeout=self.http_timeout_sec)
            if resp.status_code == 200:
                js = resp.json()
                # if js.get("status") == "ignored":
                #     self.get_logger().warn("🚫 Map ignored (mode not mapping)")
                # else:
                #     self.get_logger().info("✅ Map frame sent successfully")
            else:
                self.get_logger().warn(f"⚠️ API returned {resp.status_code}: {resp.text[:200]}")

        except Exception as e:
            self.get_logger().error(f"❌ Failed to process map: {e}")


    # ------------------------------------------------------
    # Graceful shutdown
    # ------------------------------------------------------
    def destroy_node(self):
        self.stop_flag = True
        if self.hub:
            try:
                self.hub.stop()
                self.get_logger().info("🛑 Hub disconnected cleanly")
            except Exception:
                pass
        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    node = MapSignalRStreamer()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
