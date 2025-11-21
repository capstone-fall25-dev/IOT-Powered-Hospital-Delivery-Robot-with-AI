#!/usr/bin/env python3
import rclpy
from rclpy.node import Node

import sounddevice as sd
import numpy as np
import base64
import requests
import time

from get_api_url import get_api

BASE_URL = get_api()  # VD: https://medigorobot.online hoặc http://160.187.229.40:5000
API_URL = f"{BASE_URL}/api/RobotMic/SendChunk"


class RobotMicStreamer(Node):
    def __init__(self):
        super().__init__("robot_mic_streamer")

        # ============================
        # 🎚 CẤU HÌNH AUDIO
        # ============================
        self.sample_rate = 48000   # khớp với aplay + FE
        self.channels = 1          # mono

        # Chunk ngắn hơn → giảm delay, đỡ robot
        self.chunk_ms = 40         # 40ms thay vì 100ms
        self.chunk_samples = int(self.sample_rate * self.chunk_ms / 1000)

        self.get_logger().info(
            f"🎤 RobotMicStreamer started: {self.sample_rate} Hz, "
            f"{self.channels} ch, chunk={self.chunk_ms} ms ({self.chunk_samples} samples)"
        )

        # ============================
        # 🎧 INPUT STREAM MIC (INT16)
        # ============================
        # Ghi âm trực tiếp dạng int16 để khỏi phải tự scale float32 -> int16
        self.stream = sd.InputStream(
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype="int16",                  # 🔥 quan trọng: lấy đúng PCM 16-bit
            blocksize=self.chunk_samples,
            callback=self.audio_callback,
            latency="low",                  # gợi ý giảm latency
        )
        self.stream.start()

    # ------------------------------------------------------
    # 🎧 Callback mỗi lần có 1 chunk audio từ mic
    # ------------------------------------------------------
    def audio_callback(self, indata, frames, time_info, status):
        if status:
            self.get_logger().warn(f"Audio status: {status}")

        # indata: shape (frames, channels), dtype=int16
        # Lấy kênh 0 (mono), copy ra để tránh buffer bị reuse
        mono_int16 = indata[:, 0].copy()  # (frames,)

        # ĐÃ LÀ int16 SẴN → không cần nhân / clip gì nữa
        raw_bytes = mono_int16.tobytes()

        b64 = base64.b64encode(raw_bytes).decode("ascii")
        payload = {
            "Audio_b64": b64,
            "SampleRate": self.sample_rate,
            "Channels": self.channels,
            "StreamId": "robot_mic",
            "Timestamp": int(time.time() * 1000),
        }

        try:
            # timeout nhỏ để không bị dồn request làm giật tiếng
            requests.post(API_URL, json=payload, timeout=0.3)
        except requests.exceptions.RequestException:
            # bỏ qua lỗi mạng lẻ tẻ, tránh spam log
            pass

    # ------------------------------------------------------
    # 🔚 Cleanup
    # ------------------------------------------------------
    def destroy_node(self):
        self.get_logger().info("🛑 Stopping RobotMicStreamer")

        try:
            if self.stream:
                self.stream.stop()
                self.stream.close()
        except Exception:
            pass

        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    node = RobotMicStreamer()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.shutdown()


if __name__ == "__main__":
    main()
