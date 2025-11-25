#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import rclpy
from rclpy.node import Node
from signalrcore.hub_connection_builder import HubConnectionBuilder
import base64
import subprocess
import threading
import time
import signal
import sys
import numpy as np
import sounddevice as sd
import queue
from get_api_url import get_api  # File bạn tự viết để lấy URL API

# ========================================================
# 🔗 CONFIG
# ========================================================
BASE_URL = get_api()  # Ví dụ: https://medigorobot.online
HUB_URL = f"{BASE_URL}/hubs/robotaudio"

shutdown_requested = False

# Queue chống nghẽn khi mạng chậm
send_queue = queue.Queue(maxsize=10)


def signal_handler(signum, frame):
    global shutdown_requested
    print(f"\n🛑 Nhận tín hiệu {signum}, đang tắt chương trình...")
    shutdown_requested = True


# ============================================================
# 🎧 FULL DUPLEX AUDIO NODE (ROS 2)
# ============================================================
class AudioCallNode(Node):
    def __init__(self):
        super().__init__("audio_call_node")

        self.sample_rate = 48000
        self.channels = 1
        self.chunk_ms = 20  # 20ms/chunk → mượt mà
        self.chunk_samples = int(self.sample_rate * self.chunk_ms / 1000)

        self.get_logger().info("📞 Full-Duplex Audio Call Node đã khởi động")

        # ======================================================
        # 🔊 Khởi động aplay để phát âm thanh từ web (PCM thô)
        # ======================================================
        try:
            self.aplay_proc = subprocess.Popen(
                [
                    "aplay",
                    "-t", "raw",
                    "-f", "S16_LE",
                    "-c", "1",
                    "-r", str(self.sample_rate),
                ],
                stdin=subprocess.PIPE,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            self.get_logger().info("🔊 aplay đã khởi động (PCM raw 48kHz, 16-bit, mono)")
        except Exception as e:
            self.get_logger().error(f"❌ Không thể khởi động aplay: {e}")
            self.aplay_proc = None

        # ======================================================
        # 🔗 Kết nối SignalR Hub
        # ======================================================
        self.hub_connected = False

        self.hub = (
            HubConnectionBuilder()
            .with_url(HUB_URL, options={"verify_ssl": False})
            .with_automatic_reconnect(
                {
                    "type": "raw",
                    "keep_alive_interval": 10,
                    "reconnect_interval": 5,
                    "max_attempts": 999999,
                }
            )
            .build()
        )

        # Đăng ký sự kiện nhận audio từ web
        self.hub.on("ReceiveAudioChunk", self.on_receive_audio_chunk)
        self.hub.on_open(self.on_hub_open)
        self.hub.on_close(self.on_hub_close)

        self.get_logger().info(f"🔗 Đang kết nối SignalR: {HUB_URL}")
        try:
            self.hub.start()
        except Exception as e:
            self.get_logger().error(f"❌ Không thể khởi động SignalR hub: {e}")

        # Thread riêng để gửi mic lên server (không block ROS spin)
        self.send_thread = threading.Thread(target=self.send_mic_loop, daemon=True)
        self.send_thread.start()

        # ======================================================
        # 🎤 Mở microphone (robot → web)
        # ======================================================
        self.stream = sd.InputStream(
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype="int16",
            blocksize=self.chunk_samples,
            latency="low",
            callback=self.mic_callback,
        )
        self.stream.start()
        self.get_logger().info("🎤 Mic + 🔊 Loa đã sẵn sàng!")

    # ============================================================
    # 🔔 SignalR Events
    # ============================================================
    def on_hub_open(self):
        self.hub_connected = True
        self.get_logger().info("✅ Đã kết nối SignalR hub robotaudio")

    def on_hub_close(self):
        self.hub_connected = False
        self.get_logger().warn("⚠️ Mất kết nối SignalR hub")

    # ============================================================
    # 🎤 Callback từ microphone → đưa vào queue
    # ============================================================
    def mic_callback(self, indata, frames, time_info, status):
        if status:
            self.get_logger().warn(f"Trạng thái mic: {status}")

        pcm16 = indata[:, 0].copy()

        # (Tuỳ chọn) Giảm gain nếu mic quá to
        # pcm16 = (pcm16.astype(np.float32) * 0.7).astype(np.int16)

        raw_bytes = pcm16.tobytes()
        b64 = base64.b64encode(raw_bytes).decode("utf-8")

        packet = {
            "Audio_b64": b64,
            "SampleRate": self.sample_rate,
            "Channels": self.channels,
            "StreamId": "robot_mic",
            "Timestamp": int(time.time() * 1000),
        }

        # Nếu queue đầy → bỏ gói cũ nhất (drop old frame)
        if send_queue.full():
            try:
                send_queue.get_nowait()
            except queue.Empty:
                pass

        send_queue.put(packet)

    # ============================================================
    # 🚀 Thread gửi dữ liệu mic lên server
    # ============================================================
    def send_mic_loop(self):
        while not shutdown_requested:
            try:
                packet = send_queue.get(timeout=0.05)
                if not self.hub_connected:
                    continue
                # signalrcore yêu cầu tham số là list
                self.hub.send("StreamAudioFromRobot", [packet])
            except queue.Empty:
                continue
            except Exception as e:
                self.get_logger().error(f"Lỗi gửi mic: {e}")
                time.sleep(0.01)

    # ============================================================
    # 🔊 Nhận audio từ web → phát qua loa
    # ============================================================
    def on_receive_audio_chunk(self, args):
        try:
            data = args[0] if isinstance(args, list) else args
            if not data:
                return

            audio_b64 = data.get("audio_b64") or data.get("Audio_b64")
            if not audio_b64:
                return

            raw_bytes = base64.b64decode(audio_b64)

            if self.aplay_proc and self.aplay_proc.stdin:
                self.aplay_proc.stdin.write(raw_bytes)
                self.aplay_proc.stdin.flush()
            else:
                self.get_logger().warn("⚠️ aplay_proc không khả dụng hoặc stdin đã đóng")

        except Exception as e:
            self.get_logger().error(f"Lỗi phát âm thanh: {e}")

    # ============================================================
    # 🧹 Dọn dẹp khi tắt node
    # ============================================================
    def destroy_node(self):
        global shutdown_requested
        shutdown_requested = True
        self.get_logger().info("🧹 Đang dọn dẹp tài nguyên audio...")

        try:
            self.stream.stop()
            self.stream.close()
        except Exception as e:
            self.get_logger().error(f"Lỗi dừng stream mic: {e}")

        try:
            if self.aplay_proc:
                self.aplay_proc.stdin.close()
                self.aplay_proc.terminate()
                self.aplay_proc.wait(timeout=3)
        except Exception as e:
            self.get_logger().error(f"Lỗi dừng aplay: {e}")

        try:
            self.hub.stop()
        except Exception:
            pass

        super().destroy_node()


# ============================================================
# 🔥 MAIN
# ============================================================
def main(args=None):
    global shutdown_requested

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    rclpy.init(args=args)
    node = AudioCallNode()

    executor = rclpy.executors.SingleThreadedExecutor()
    executor.add_node(node)

    try:
        while not shutdown_requested:
            executor.spin_once(timeout_sec=0.1)
            time.sleep(0.001)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()
        print("👋 Đã tắt Audio Call Node thành công!")

if __name__ == "__main__":
    main()