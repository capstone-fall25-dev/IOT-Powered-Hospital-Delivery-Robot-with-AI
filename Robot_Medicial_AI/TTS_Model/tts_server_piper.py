from flask import Flask, request, jsonify
import logging
import os
import sys
import threading
import time
import io
import wave

import sounddevice as sd
import soundfile as sf

# =========================
# 1. IMPORT PIPER
# =========================
try:
    from piper import PiperVoice, SynthesisConfig
except ImportError:
    print("❌ Chưa cài piper-tts. Chạy: pip install piper-tts")
    sys.exit(1)

# =========================
# 2. IMPORT SIGNALR
# =========================
try:
    from signalrcore.hub_connection_builder import HubConnectionBuilder
except ImportError:
    print("❌ Thiếu thư viện signalrcore. Chạy: pip install signalrcore")
    sys.exit(1)

app = Flask(__name__)

# =========================
# 3. CẤU HÌNH MODEL
# =========================
base_dir = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(base_dir, "model_piper", "model.onnx")
CONFIG_PATH = os.path.join(base_dir, "model_piper", "model.onnx.json")
SIGNALR_HUB_URL = "https://medigorobot.online/hubs/ttsHub"

if not os.path.exists(MODEL_PATH) or not os.path.exists(CONFIG_PATH):
    print(f"❌ KHÔNG TÌM THẤY MODEL TẠI: {MODEL_PATH}")
    print("👉 Hãy chạy script download_piper.py để tải model.")
    sys.exit(1)

print(f"📂 Đang load Piper model từ: {MODEL_PATH}")
voice = None
try:
    try:
        # Thử dùng GPU
        voice = PiperVoice.load(MODEL_PATH, config_path=CONFIG_PATH, use_cuda=True)
        print("✅ Piper TTS sẵn sàng (GPU/CUDA)")
    except Exception as e:
        print(f"⚠️ Không dùng được CUDA ({e}), fallback CPU...")
        voice = PiperVoice.load(MODEL_PATH, config_path=CONFIG_PATH, use_cuda=False)
        print("✅ Piper TTS sẵn sàng (CPU)")
except Exception as e:
    print(f"❌ Lỗi fatal khi load Piper model: {e}")
    sys.exit(1)

# =========================
# 4. SynthesisConfig (API mới)
# =========================
SYN_CONFIG = SynthesisConfig(
    volume=1.0,
    length_scale=float(getattr(voice.config, "length_scale", 1.0)),
    noise_scale=float(getattr(voice.config, "noise_scale", 1.0)),
    noise_w_scale=float(getattr(voice.config, "noise_w", 1.0)),
    normalize_audio=False,
)

print(f"🎚 SAMPLE_RATE Piper từ config: {getattr(voice.config, 'sample_rate', 'unknown')}")

# Khóa tránh nói chồng nhau
audio_lock = threading.Lock()

# =========================
# 5. PLAY AUDIO VỚI PIPER
# =========================
def play_audio(text: str) -> bool:
    """TTS với Piper, phát ra loa bằng sounddevice"""
    if not text:
        return False

    # Nếu đang nói thì bỏ qua lệnh mới
    if not audio_lock.acquire(blocking=False):
        print("⚠️ Piper đang nói, bỏ qua lệnh mới.")
        return False

    try:
        print(f"🔊 PIPER ĐANG ĐỌC: {text}")

        # 1. Synthesize ra WAV trong RAM (BytesIO)
        buffer = io.BytesIO()
        # Mở wave với 'wb' (write-binary) giống mẫu chính thức
        with wave.open(buffer, "wb") as wav_file:
            # API mới: dùng synthesize_wav + SynthesisConfig
            voice.synthesize_wav(
                text,
                wav_file,
                syn_config=SYN_CONFIG,
            )

        # 2. Quay về đầu buffer
        buffer.seek(0)

        # 3. Đọc WAV thành numpy array float32
        data, samplerate = sf.read(buffer, dtype="float32")

        # 4. Phát ra loa
        sd.play(data, samplerate=samplerate)
        sd.wait()

        return True
    except Exception as e:
        print(f"❌ Lỗi âm thanh Piper: {repr(e)}")
        return False
    finally:
        audio_lock.release()

# =========================
# 6. SIGNALR CLIENT
# =========================
def setup_signalr():
    """Kết nối tới C# Backend (hubs/ttsHub)"""
    print(f"🌐 Đang kết nối tới SignalR Hub: {SIGNALR_HUB_URL} ...")

    hub_connection = (
        HubConnectionBuilder()
        .with_url(SIGNALR_HUB_URL)
        .configure_logging(logging.ERROR)
        .with_automatic_reconnect(
            {
                "type": "raw",
                "keep_alive_interval": 10,
                "reconnect_interval": 5,
                "max_attempts": 10,
            }
        )
        .build()
    )

    hub_connection.on("ReceiveTTS", on_receive_tts_message)

    try:
        hub_connection.start()
        print("✅ Đã kết nối thành công tới MedigoRobot TTS Hub!")
    except Exception as e:
        print(f"❌ Không thể kết nối tới MedigoRobot TTS Hub: {e}")

    # Giữ connection sống
    while True:
        time.sleep(2)


def on_receive_tts_message(arguments):
    """Callback khi Backend gọi Clients.All.SendAsync(\"ReceiveTTS\", text)"""
    try:
        if not arguments:
            print("⚠️ Nhận ReceiveTTS nhưng arguments rỗng")
            return

        text_received = arguments[0]
        print(f"📩 Nhận tín hiệu từ Web: {text_received}")
        play_audio(text_received)
    except Exception as e:
        print(f"❌ Lỗi xử lý tin nhắn SignalR: {e}")

# =========================
# 7. API FLASK /speak
# =========================
@app.route("/speak", methods=["POST"])
def speak():
    data = request.get_json(force=True, silent=True) or {}
    text = data.get("text", "")
    ok = play_audio(text)
    if ok:
        return jsonify({"status": "success"}), 200
    else:
        return jsonify({"status": "error"}), 500

# =========================
# 8. MAIN
# =========================
if __name__ == "__main__":
    # Chạy SignalR ở thread background
    t = threading.Thread(target=setup_signalr, daemon=True)
    t.start()

    print("🚀 Piper Flask TTS Server đang chạy port 5000...")
    app.run(host="0.0.0.0", port=5000)