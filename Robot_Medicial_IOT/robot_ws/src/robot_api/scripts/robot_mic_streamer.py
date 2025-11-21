#!/usr/bin/env python3
import rclpy
from rclpy.node import Node

import sounddevice as sd
import numpy as np
import base64
import requests
import time

from get_api_url import get_api

BASE_URL = get_api()  # VD: http://192.168.1.100:5000
API_URL = f"{BASE_URL}/api/RobotMic/SendChunk"


class RobotMicStreamer(Node):
    def __init__(self):
        super().__init__("robot_mic_streamer")

        # Cấu hình audio
        self.sample_rate = 48000   # nên khớp với aplay và FE
        self.channels = 1          # mono
        self.chunk_ms = 100        # mỗi chunk 100ms
        self.chunk_samples = int(self.sample_rate * self.chunk_ms / 1000)

        self.get_logger().info(
            f"🎤 RobotMicStreamer started: {self.sample_rate} Hz, "
            f"{self.channels} ch, chunk={self.chunk_ms} ms ({self.chunk_samples} samples)"
        )

        # Khởi tạo stream input từ microphone
        self.stream = sd.InputStream(
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype="float32",
            blocksize=self.chunk_samples,
            callback=self.audio_callback,
        )
        self.stream.start()

    # ------------------------------------------------------
    # 🎧 Callback mỗi lần có 1 chunk audio từ mic
    # ------------------------------------------------------
    def audio_callback(self, indata, frames, time_info, status):
        if status:
            self.get_logger().warn(f"Audio status: {status}")

        # indata: shape (frames, channels), float32 [-1, 1]
        mono = indata[:, 0]  # lấy kênh 0 (mono)
        mono_clipped = np.clip(mono, -1.0, 1.0)

        # float32 [-1,1] -> int16
        pcm_int16 = (mono_clipped * 32767).astype(np.int16)
        raw_bytes = pcm_int16.tobytes()

        b64 = base64.b64encode(raw_bytes).decode("utf-8")
        payload = {
            "Audio_b64": b64,
            "SampleRate": self.sample_rate,
            "Channels": self.channels,
            "StreamId": "robot_mic",
            "Timestamp": int(time.time() * 1000),
        }

        try:
            requests.post(API_URL, json=payload, timeout=0.5)
        except requests.exceptions.RequestException:
            # không spam log, có thể uncomment debug nếu cần
            # self.get_logger().warn(f"POST error: {e}")
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
