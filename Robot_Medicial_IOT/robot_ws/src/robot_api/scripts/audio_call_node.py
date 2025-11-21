#!/usr/bin/env python3
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

from get_api_url import get_api


# ========================================================
# 🔗 CONFIG
# ========================================================
BASE_URL = get_api()  # vd: https://medigorobot.online
HUB_URL = f"{BASE_URL}/hubs/robotaudio"

shutdown_requested = False

# Queue chống nghẽn audio khi mạng yếu
send_queue = queue.Queue(maxsize=10)


def signal_handler(signum, frame):
    global shutdown_requested
    print(f"\n🛑 Received signal {signum}, shutting down...")
    shutdown_requested = True


# ============================================================
# 🎧 FULL DUPLEX AUDIO NODE
# ============================================================
class AudioCallNode(Node):
    def __init__(self):
        super().__init__("audio_call_node")

        self.sample_rate = 48000
        self.channels = 1
        self.chunk_ms = 20                     # 20ms → mượt
        self.chunk_samples = int(self.sample_rate * self.chunk_ms / 1000)

        self.get_logger().info("📞 Full-Duplex Audio Call Node Started")

        # ======================================================
        # 🔊 START APLAY OUTPUT
        # ======================================================
        self.aplay_proc = subprocess.Popen(
            ["aplay", "-f", "S16_LE", "-c", "1", "-r", "48000"],
            stdin=subprocess.PIPE,
        )

        # ======================================================
        # 🔗 SIGNALR CONNECT
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

        # server → robot (audio từ web)
        self.hub.on("ReceiveAudioChunk", self.on_receive_audio_chunk)

        # log trạng thái hub
        self.hub.on_open(self.on_hub_open)
        self.hub.on_close(self.on_hub_close)

        # 👉 start hub NGAY TRONG __init__ (không cần thread riêng)
        try:
            self.hub.start()
        except Exception as e:
            self.get_logger().error(f"❌ Không start được SignalR hub: {e}")

        # Thread gửi mic lên server
        self.send_thread = threading.Thread(target=self.send_mic_loop, daemon=True)
        self.send_thread.start()

        # ======================================================
        # 🎤 MICROPHONE CAPTURE
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

        self.get_logger().info("🎤 Mic + 🔊 Speaker READY")

    # ============================================================
    # 🔔 Hub events
    # ============================================================
    def on_hub_open(self):
        self.hub_connected = True
        self.get_logger().info("✅ SignalR robotaudio hub connected")

    def on_hub_close(self):
        self.hub_connected = False
        self.get_logger().warn("⚠️ SignalR robotaudio hub disconnected")

    # ============================================================
    # 🎤 Mic Callback → đưa vào queue
    # ============================================================
    def mic_callback(self, indata, frames, time_info, status):
        if status:
            self.get_logger().warn(f"Mic status: {status}")

        pcm16 = indata[:, 0].copy()

        # (tùy chọn) giảm gain nhẹ để đỡ bể tiếng nếu mic ROS để quá to
        # pcm16 = (pcm16.astype(np.float32) * 0.8).astype(np.int16)

        raw_bytes = pcm16.tobytes()
        b64 = base64.b64encode(raw_bytes).decode()

        packet = {
            "Audio_b64": b64,
            "SampleRate": self.sample_rate,
            "Channels": self.channels,
            "StreamId": "robot_mic",
            "Timestamp": int(time.time() * 1000),
        }

        if send_queue.full():
            try:
                send_queue.get_nowait()  # drop gói cũ nhất
            except:
                pass

        send_queue.put(packet)

    # ============================================================
    # 🚀 Gửi MIC → SignalR
    # ============================================================
    def send_mic_loop(self):
        while not shutdown_requested:
            try:
                packet = send_queue.get(timeout=0.05)

                # ❗ Chỉ gửi khi hub đã connect
                if not self.hub_connected:
                    continue

                # signalrcore yêu cầu args là LIST
                self.hub.send("StreamAudioFromRobot", [packet])
            except queue.Empty:
                pass
            except Exception as e:
                print("Send mic err:", e)

    # ============================================================
    # 🔊 Nhận audio từ server → phát qua aplay
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

        except Exception as e:
            self.get_logger().error(f"Playback error: {e}")

    # ============================================================
    # 🧹 Cleanup
    # ============================================================
    def destroy_node(self):
        print("🧹 Cleaning up audio...")

        try:
            self.stream.stop()
            self.stream.close()
        except:
            pass

        try:
            if self.aplay_proc:
                self.aplay_proc.stdin.close()
                self.aplay_proc.terminate()
        except:
            pass

        try:
            self.hub.stop()
        except:
            pass

        super().destroy_node()


# ============================================================
# 🔥 MAIN LOOP
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
    except KeyboardInterrupt:
        pass

    node.destroy_node()
    rclpy.shutdown()


if __name__ == "__main__":
    main()
