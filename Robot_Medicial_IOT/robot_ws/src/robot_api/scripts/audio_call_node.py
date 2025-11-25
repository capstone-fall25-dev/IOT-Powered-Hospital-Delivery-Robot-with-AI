#!/usr/bin/env python3
import asyncio
import json
import logging
import os
import sys
import threading
import time
import signal
import fractions

import numpy as np
import pyaudio
import rclpy
from rclpy.node import Node

# ==== WebRTC ====
from aiortc import (
    RTCPeerConnection,
    RTCSessionDescription,
    MediaStreamTrack,
)
from av.audio.frame import AudioFrame

# ==== SignalR ====
from signalrcore.hub_connection_builder import HubConnectionBuilder

# ==== API CONFIG ====
from get_api_url import get_api

# ========================================================
# 🔗 CONFIG
# ========================================================
BASE_URL = get_api()  # ví dụ: https://medigorobot.online
HUB_URL = f"{BASE_URL}/hubs/robotaudio"

AUDIO_SAMPLE_RATE = 48000
AUDIO_CHUNK = 960  # 20ms @ 48kHz
AUDIO_CHANNELS = 1

shutdown_requested = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("robot-webrtc")


# ============================================================
# 🔇 Suppress ALSA warnings
# ============================================================
class ALSAErrorSuppress:
    def __enter__(self):
        self.original_stderr = sys.stderr
        sys.stderr = open(os.devnull, "w")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            sys.stderr.close()
        except Exception:
            pass
        sys.stderr = self.original_stderr


# ============================================================
# 🎤 MIC ROBOT → WEBRTC (PyAudio input)
# ============================================================
class RobotMicTrack(MediaStreamTrack):
    kind = "audio"

    def __init__(self, sample_rate=AUDIO_SAMPLE_RATE, channels=AUDIO_CHANNELS):
        super().__init__()  # type: ignore
        self.sample_rate = sample_rate
        self.channels = channels
        self.chunk = AUDIO_CHUNK
        self.pts = 0
        self.time_base = fractions.Fraction(1, self.sample_rate)

        self.pa = None
        self.stream = None
        self.running = True

        self._init_audio()

    def _init_audio(self):
        try:
            with ALSAErrorSuppress():
                self.pa = pyaudio.PyAudio()

            input_count = self.pa.get_device_count()
            logger.info(f"🔍 PyAudio input devices: {input_count}")

            selected_index = None

            for i in range(input_count):
                try:
                    with ALSAErrorSuppress():
                        info = self.pa.get_device_info_by_index(i)
                    max_in = info.get("maxInputChannels", 0)
                    name = info.get("name", "Unknown")

                    if max_in > 0:
                        logger.info(f"🎤 Try input device {i}: {name}")
                        # Thử open nhanh để test thiết bị
                        try:
                            with ALSAErrorSuppress():
                                test_stream = self.pa.open(
                                    format=pyaudio.paInt16,
                                    channels=self.channels,
                                    rate=self.sample_rate,
                                    input=True,
                                    input_device_index=i,
                                    frames_per_buffer=self.chunk,
                                )
                                test_stream.close()
                            selected_index = i
                            logger.info(f"✅ Use input device {i}: {name}")
                            break
                        except Exception as e:
                            logger.warning(f"⚠ Device {i} error: {e}")
                            continue
                except Exception:
                    continue

            if selected_index is None:
                logger.warning("⚠ No suitable input device, using silence")
                return

            with ALSAErrorSuppress():
                self.stream = self.pa.open(
                    format=pyaudio.paInt16,
                    channels=self.channels,
                    rate=self.sample_rate,
                    input=True,
                    input_device_index=selected_index,
                    frames_per_buffer=self.chunk,
                )

            logger.info("🎤 RobotMicTrack: PyAudio InputStream started")
        except Exception as e:
            logger.error(f"❌ RobotMicTrack init error: {e}")
            self.stream = None

    async def recv(self) -> AudioFrame:
        if not self.running:
            raise ConnectionError("RobotMicTrack stopped")

        try:
            if self.stream:
                with ALSAErrorSuppress():
                    data = self.stream.read(self.chunk, exception_on_overflow=False)
            else:
                data = np.zeros(self.chunk, dtype=np.int16).tobytes()
        except Exception as e:
            logger.warning(f"Mic read error: {e}")
            data = np.zeros(self.chunk, dtype=np.int16).tobytes()

        frame = AudioFrame(format="s16", layout="mono", samples=self.chunk)
        frame.sample_rate = self.sample_rate
        frame.planes[0].update(data)
        frame.pts = self.pts
        frame.time_base = self.time_base
        self.pts += self.chunk

        # debug mỗi ~1s
        if (self.pts // self.chunk) % 50 == 0:
            logger.info("🎤 RobotMicTrack sending audio frame...")

        return frame

    def stop(self):
        """Được aiortc gọi sync → KHÔNG async."""
        self.running = False
        try:
            if self.stream:
                with ALSAErrorSuppress():
                    self.stream.stop_stream()
                    self.stream.close()
        except Exception:
            pass

        try:
            if self.pa:
                with ALSAErrorSuppress():
                    self.pa.terminate()
        except Exception:
            pass

        logger.info("🎤 RobotMicTrack stopped")


# ============================================================
# 🎧 WEBRTC AUDIO CALL NODE (ROS2 + SignalR)
#   - Chỉ gửi MIC robot lên web
#   - KHÔNG phát loa (bỏ SpeakerPlayer)
#   - Hỗ trợ tắt/bật nhiều lần (reset PC & mic mỗi OFFER mới)
# ============================================================
class AudioCallNode(Node):
    def __init__(self):
        super().__init__("audio_call_node")

        self.get_logger().info("📞 WebRTC Audio Call Node Started")

        # WebRTC event loop riêng
        self.webrtc_loop = asyncio.new_event_loop()
        self.pc: RTCPeerConnection | None = None
        self.mic_track: RobotMicTrack | None = None

        self._start_webrtc_loop()

        # SignalR hub
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

        # Web → Robot: OFFER + ICE
        self.hub.on("ReceiveOffer", self.on_receive_offer)
        self.hub.on("ReceiveIceCandidate", self.on_receive_ice_candidate)

        # log trạng thái hub
        self.hub.on_open(self.on_hub_open)
        self.hub.on_close(self.on_hub_close)

        self.get_logger().info(f"🔗 Connecting SignalR hub: {HUB_URL}")

        # Start hub trong thread riêng
        threading.Thread(target=self.hub.start, daemon=True).start()

        self.get_logger().info("🎤 WebRTC Mic ONLY (no speaker) READY")

    # --------------------------------------------------------
    # WebRTC event loop
    # --------------------------------------------------------
    def _start_webrtc_loop(self):
        def _run_loop(loop: asyncio.AbstractEventLoop):
            asyncio.set_event_loop(loop)
            loop.run_forever()

        self.webrtc_thread = threading.Thread(
            target=_run_loop, args=(self.webrtc_loop,), daemon=True
        )
        self.webrtc_thread.start()

    def _run_webrtc_coroutine(self, coro):
        return asyncio.run_coroutine_threadsafe(coro, self.webrtc_loop)

    # --------------------------------------------------------
    # Init WebRTC PeerConnection (handlers)
    # --------------------------------------------------------
    async def _init_webrtc(self):
        # Tạo PeerConnection mới
        self.pc = RTCPeerConnection()
        logger.info("✅ RTCPeerConnection created")

        @self.pc.on("track")
        async def on_track(track):
            # Vẫn nhận track từ web, nhưng bỏ qua (không phát loa)
            print(f"[WebRTC] Track received (ignored): kind={track.kind}")

        @self.pc.on("icecandidate")
        async def on_icecandidate(candidate):
            if candidate is None:
                return
            try:
                cand_dict = {
                    "candidate": candidate.candidate,
                    "sdpMid": candidate.sdpMid,
                    "sdpMLineIndex": candidate.sdpMLineIndex,
                }
                cand_json = json.dumps(cand_dict)
                # Gửi ICE lên hub → hub broadcast sang web
                self.hub.send("SendIceCandidate", [cand_json])
                print("[WebRTC] Sent ICE candidate to hub")
            except Exception as e:
                print("Error sending ICE candidate:", e)

        @self.pc.on("connectionstatechange")
        async def on_state_change():
            state = self.pc.connectionState
            print(f"[WebRTC] connectionState = {state}")
            # Nếu PC failed/closed → dọn mic luôn cho sạch
            if state in ("failed", "closed"):
                if self.mic_track is not None:
                    self.mic_track.stop()
                    self.mic_track = None

    # --------------------------------------------------------
    # Hub events
    # --------------------------------------------------------
    def on_hub_open(self):
        self.hub_connected = True
        self.get_logger().info("✅ SignalR robotaudio hub connected")

    def on_hub_close(self):
        self.hub_connected = False
        self.get_logger().warn("⚠️ SignalR robotaudio hub disconnected")

    # --------------------------------------------------------
    # Receive OFFER from web → create ANSWER
    #   - Mỗi OFFER mới: reset PC + mic
    # --------------------------------------------------------
    def on_receive_offer(self, args):
        try:
            sdp = args[0] if isinstance(args, list) else args
            print(f"[SignalR] ReceiveOffer, len={len(sdp)}")
            self._run_webrtc_coroutine(self._handle_offer(sdp))
        except Exception as e:
            logger.error(f"Error in on_receive_offer: {e}")

    async def _handle_offer(self, sdp: str):
        # ===== 1) Dọn PeerConnection cũ nếu có =====
        if self.pc is not None:
            try:
                await self.pc.close()
                print("[WebRTC] Old PeerConnection closed")
            except Exception:
                pass
            self.pc = None

        # Dọn mic cũ
        if self.mic_track is not None:
            try:
                self.mic_track.stop()
                print("[WebRTC] Old RobotMicTrack stopped")
            except Exception:
                pass
            self.mic_track = None

        # ===== 2) Tạo PeerConnection mới =====
        await self._init_webrtc()

        # ===== 3) Set Remote OFFER =====
        offer = RTCSessionDescription(sdp=sdp, type="offer")
        await self.pc.setRemoteDescription(offer)
        print("[WebRTC] RemoteDescription (offer) set")

        # ===== 4) Chuẩn bị MIC robot → web =====
        self.mic_track = RobotMicTrack()
        if self.mic_track.stream:
            self.pc.addTrack(self.mic_track)
            print("🎤 RobotMicTrack added to PeerConnection")
        else:
            print("⚠ RobotMicTrack has no active input stream")

        # ===== 5) Tạo ANSWER =====
        answer = await self.pc.createAnswer()
        await self.pc.setLocalDescription(answer)
        print("[WebRTC] LocalDescription (answer) created")

        # ===== 6) Gửi ANSWER về hub → hub gửi lên web (ReceiveAnswer) =====
        self.hub.send("SendAnswerToWeb", [self.pc.localDescription.sdp])
        print("[SignalR] Sent ANSWER SDP back to web")

    # --------------------------------------------------------
    # Receive ICE from web
    # --------------------------------------------------------
    def on_receive_ice_candidate(self, args):
        try:
            cand_json = args[0] if isinstance(args, list) else args
            self._run_webrtc_coroutine(self._handle_remote_candidate(cand_json))
        except Exception as e:
            logger.error(f"Error in on_receive_ice_candidate: {e}")

    async def _handle_remote_candidate(self, cand_json: str):
        if not cand_json or self.pc is None:
            # Không có PC hiện tại → bỏ qua ICE này
            return
        try:
            data = json.loads(cand_json)
            cand = data.get("candidate")
            if not cand:
                return

            candidate = aiortc_candidate_from_json(data)
            # addIceCandidate trên PC hiện tại
            try:
                await self.pc.addIceCandidate(candidate)
                print("[WebRTC] Remote ICE candidate added")
            except Exception as e:
                # Nếu PC đã closed/failed → log nhưng không crash
                logger.error(f"Error adding ICE on current PC: {e}")
        except Exception as e:
            logger.error(f"Error parsing remote ICE: {e}")


# Helper: convert JSON (WebRTC ICE) → aiortc RTCIceCandidate
def aiortc_candidate_from_json(data: dict):
    from aiortc.sdp import candidate_from_sdp  # import ở đây để tránh lỗi version

    cand_sdp = data.get("candidate")
    if cand_sdp.startswith("candidate:"):
        cand_body = cand_sdp[len("candidate:") :]
    else:
        cand_body = cand_sdp

    candidate = candidate_from_sdp(cand_body)
    candidate.sdpMid = data.get("sdpMid")
    candidate.sdpMLineIndex = data.get("sdpMLineIndex")
    return candidate


# ============================================================
# 🧹 Cleanup
# ============================================================
async def _cleanup_webrtc(node: AudioCallNode):
    if node.mic_track is not None:
        try:
            node.mic_track.stop()
        except Exception:
            pass
        node.mic_track = None

    if node.pc is not None:
        try:
            await node.pc.close()
        except Exception:
            pass
        node.pc = None


# ============================================================
# 🔥 MAIN LOOP
# ============================================================
def signal_handler(signum, frame):
    global shutdown_requested
    print(f"\n🛑 Received signal {signum}, shutting down...")
    shutdown_requested = True


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
            time.sleep(0.01)
    except KeyboardInterrupt:
        pass

    # cleanup WebRTC
    try:
        fut = node._run_webrtc_coroutine(_cleanup_webrtc(node))
        fut.result(timeout=5)
    except Exception:
        pass

    try:
        node.hub.stop()
    except Exception:
        pass

    rclpy.shutdown()


if __name__ == "__main__":
    main()
