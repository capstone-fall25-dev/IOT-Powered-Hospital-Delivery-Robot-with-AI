#!/usr/bin/env python3
import asyncio
import json
import threading
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from signalrcore.hub_connection_builder import HubConnectionBuilder

# ⚙️ Địa chỉ Hub backend ASP.NET (đổi khi chạy trên server thật)
HUB_URL = "http://localhost:5170/hubs/robotposition"

class CompartmentSignalSubscriber(Node):
    def __init__(self):
        super().__init__('compartment_signal_subscriber')

        self.publisher_ = self.create_publisher(String, '/control_box', 10)
        self.get_logger().info("🚀 ROS2 Node - SignalR Listener started")

        # Khởi tạo event loop riêng để chạy SignalR
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self.loop.create_task(self.start_signalr_listener())

        # Chạy event loop trong thread riêng để không block ROS2
        threading.Thread(target=self.loop.run_forever, daemon=True).start()

        # Trạng thái ngăn hiện tại
        self.state = {"A1": 0, "A2": 0}

    async def start_signalr_listener(self):
        try:
            self.get_logger().info(f"🔗 Connecting to SignalR Hub at {HUB_URL}...")

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

            # =============================
            # 🎧 Sự kiện: Nhận tín hiệu ngăn thuốc
            # =============================
            def on_receive_compartment_signal(args):
                try:
                    data = args[0] if args else {}
                    print("\n📦 Received Compartment Signal from backend:")
                    print(json.dumps(data, indent=2, ensure_ascii=False))

                    comp_code = data.get("compartment_code", "")
                    state = int(data.get("state", 0))

                    # Cập nhật trạng thái
                    if comp_code in self.state:
                        self.state[comp_code] = state

                    # Xuất ra topic ROS2
                    msg = String()
                    msg.data = f"{self.state['A1']} {self.state['A2']}"
                    self.publisher_.publish(msg)

                    state_text = "🟢 OPEN" if state == 1 else "🔴 CLOSE"
                    print(f"➡️ Compartment {comp_code}: {state_text}")
                    print(f"✅ Published: '{msg.data}' -> /control_box")

                except Exception as e:
                    print(f"⚠️ Error processing signal: {e}")

            # =============================
            # 🎧 Sự kiện: Nhận lệnh điều khiển robot
            # =============================
            def on_receive_robot_command(args):
                try:
                    cmd = args[0] if args else {}
                    print("\n🤖 Received Robot Command:")
                    print(json.dumps(cmd, indent=2, ensure_ascii=False))
                except Exception as e:
                    print(f"⚠️ Error processing command: {e}")

            # Đăng ký sự kiện giống như JS client
            self.hub_connection.on("ReceiveCompartmentSignal", on_receive_compartment_signal)
            self.hub_connection.on("ReceiveRobotCommand", on_receive_robot_command)

            # Sự kiện kết nối lại
            self.hub_connection.on_open(lambda: print("✅ Connected to SignalR Hub!"))
            self.hub_connection.on_close(lambda: print("❌ Connection closed"))
            self.hub_connection.on_error(lambda err: print(f"⚠️ Connection error: {err}"))

            # Kết nối
            self.hub_connection.start()
        except Exception as e:
            self.get_logger().error(f"❌ Failed to connect SignalR: {e}")

def main(args=None):
    rclpy.init(args=args)
    node = CompartmentSignalSubscriber()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        print("🛑 Interrupted by user")
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == "__main__":
    main()
