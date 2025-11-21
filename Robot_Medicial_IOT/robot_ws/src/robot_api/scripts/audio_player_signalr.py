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

from get_api_url import get_api

BASE_URL = get_api() 
HUB_URL = f"{BASE_URL}/hubs/robotaudio"

shutdown_requested = False


def signal_handler(signum, frame):
    global shutdown_requested
    print(f"\n🛑 Received signal {signum}, shutting down audio player...")
    shutdown_requested = True


class AudioPlayerSignalR(Node):
    def __init__(self):
        super().__init__("audio_player_signalr")

        self.get_logger().info(f"🔊 AudioPlayerSignalR connecting to: {HUB_URL}")

        # Mặc định dùng 48kHz, 16-bit, mono
        self.sample_rate = 48000
        self.channels = 1

        # Khởi tạo process aplay (stream PCM qua stdin)
        # Nếu bạn dùng 16000 Hz thì chỉnh -r 16000
        self.aplay_proc = subprocess.Popen(
            ["aplay", "-f", "S16_LE", "-r", str(self.sample_rate), "-c", str(self.channels)],
            stdin=subprocess.PIPE
        )

        # Kết nối SignalR
        self.hub_connection = (
            HubConnectionBuilder()
            .with_url(HUB_URL, options={"verify_ssl": False})
            .with_automatic_reconnect(
                {
                    "type": "raw",
                    "keep_alive_interval": 10,
                    "reconnect_interval": 5,
                    "max_attempts": 9999,
                }
            )
            .build()
        )

        # Đăng ký handler cho event ReceiveAudioChunk
        self.hub_connection.on("ReceiveAudioChunk", self.on_receive_audio_chunk)

        # Bắt đầu chạy SignalR trong thread riêng
        self.thread = threading.Thread(target=self.run_signalr, daemon=True)
        self.thread.start()

        self.get_logger().info("✅ AudioPlayerSignalR started, waiting for audio chunks...")

    # ------------------------------------------------------
    # 🔄 Chạy SignalR
    # ------------------------------------------------------
    def run_signalr(self):
        try:
            self.hub_connection.start()
            while not shutdown_requested:
                time.sleep(0.1)
        except Exception as e:
            self.get_logger().error(f"SignalR error: {e}")
        finally:
            self.hub_connection.stop()

    # ------------------------------------------------------
    # 🎧 Handler khi nhận 1 chunk audio
    # ------------------------------------------------------
    def on_receive_audio_chunk(self, args):
        """
        args thường là [chunkData]
        chunkData:
        {
            "type": "audio_chunk",
            "stream_id": "...",
            "audio_b64": "...",
            "sampleRate": 48000,
            "channels": 1,
            "timestamp": "2025-11-21T..."
        }
        """
        try:
            data = args[0] if isinstance(args, list) and len(args) > 0 else args
            if not data:
                return

            audio_b64 = data.get("audio_b64") or data.get("Audio_b64")
            if not audio_b64:
                return

            # Cập nhật sample rate / channels nếu FE gửi lên
            sr = data.get("sampleRate")
            ch = data.get("channels")
            if sr and sr != self.sample_rate:
                # NOTE: Đơn giản là bỏ qua, hoặc bạn stop aplay và mở lại với sample_rate mới
                self.get_logger().warn(
                    f"⚠️ Received sampleRate={sr} khác với current={self.sample_rate}, "
                    "tạm thời vẫn dùng aplay hiện tại"
                )
            if ch and ch != self.channels:
                self.get_logger().warn(
                    f"⚠️ Received channels={ch} khác với current={self.channels}"
                )

            raw_bytes = base64.b64decode(audio_b64)

            if self.aplay_proc and self.aplay_proc.stdin:
                try:
                    self.aplay_proc.stdin.write(raw_bytes)
                    self.aplay_proc.stdin.flush()
                except BrokenPipeError:
                    self.get_logger().error("❌ aplay stdin bị đóng, thử mở lại...")
                    self.restart_aplay()

        except Exception as e:
            self.get_logger().error(f"❌ Error in on_receive_audio_chunk: {e}")

    # ------------------------------------------------------
    # ♻️ Restart aplay nếu bị crash
    # ------------------------------------------------------
    def restart_aplay(self):
        try:
            if self.aplay_proc:
                self.aplay_proc.kill()
        except Exception:
            pass

        self.aplay_proc = subprocess.Popen(
            ["aplay", "-f", "S16_LE", "-r", str(self.sample_rate), "-c", str(self.channels)],
            stdin=subprocess.PIPE
        )
        self.get_logger().info("✅ aplay restarted")

    # ------------------------------------------------------
    # 🔚 Cleanup
    # ------------------------------------------------------
    def destroy_node(self):
        self.get_logger().info("🧹 Shutting down AudioPlayerSignalR")

        try:
            self.hub_connection.stop()
        except Exception:
            pass

        try:
            if self.aplay_proc:
                self.aplay_proc.stdin.close()
                self.aplay_proc.terminate()
        except Exception:
            pass

        super().destroy_node()


def main(args=None):
    global shutdown_requested
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    rclpy.init(args=args)
    node = AudioPlayerSignalR()

    try:
        while not shutdown_requested:
            rclpy.spin_once(node, timeout_sec=0.1)
    except KeyboardInterrupt:
        pass

    node.destroy_node()
    rclpy.shutdown()


if __name__ == "__main__":
    main()
