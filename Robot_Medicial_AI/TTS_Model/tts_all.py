#!/usr/bin/env python3
from flask import Flask, request, jsonify
import logging, os, sys, threading, time, io, wave
import numpy as np
import sounddevice as sd
import soundfile as sf

# =========================
# SignalR (bắt buộc)
# =========================
try:
    from signalrcore.hub_connection_builder import HubConnectionBuilder
except ImportError:
    print("❌ Thiếu signalrcore. Chạy: pip install signalrcore")
    sys.exit(1)

# =========================
# VITS (giọng 1 - nam)
# =========================
HAS_VITS = True
try:
    import torch
    from transformers import VitsModel, AutoTokenizer
except Exception as e:
    print(f"⚠️ Không thể import VITS: {e}")
    HAS_VITS = False

# =========================
# Piper (giọng 2 - nữ)
# =========================
HAS_PIPER = True
try:
    from piper import PiperVoice, SynthesisConfig
except Exception as e:
    print(f"⚠️ Không thể import Piper: {e}")
    HAS_PIPER = False

# =========================
# CẤU HÌNH CHUNG
# =========================
app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Hub URL
SIGNALR_HUB_URL = "https://medigorobot.online/hubs/ttsHub"

# Gán mã robot nếu muốn giới hạn xử lý theo robot
MY_ROBOT_CODE = os.environ.get("ROBOT_CODE", "").strip()  # "" = nhận tất cả

# VITS model dir
VITS_MODEL_DIR = os.path.join(BASE_DIR, "model_vn")
DEVICE = "cuda" if (HAS_VITS and hasattr(torch, "cuda") and torch.cuda.is_available()) else "cpu"

# Piper model dir
PIPER_MODEL_PATH = os.path.join(BASE_DIR, "model_piper", "model.onnx")
PIPER_CONFIG_PATH = os.path.join(BASE_DIR, "model_piper", "model.onnx.json")

# Trạng thái runtime
audio_lock = threading.Lock()
current_voice = 1  # 1 = VITS (mặc định), 2 = Piper
hub_connection = None

# =========================
# LOAD VITS
# =========================
tokenizer = None
vits_model = None
vits_sr = None

if HAS_VITS and os.path.isdir(VITS_MODEL_DIR):
    try:
        print(f"📂 Loading VITS from {VITS_MODEL_DIR}")
        tokenizer = AutoTokenizer.from_pretrained(VITS_MODEL_DIR)
        vits_model = VitsModel.from_pretrained(VITS_MODEL_DIR).to(DEVICE)
        vits_sr = vits_model.config.sampling_rate
        print(f"✅ VITS ready (device={DEVICE}, sr={vits_sr})")
    except Exception as e:
        print(f"❌ Lỗi load VITS: {e}")
        HAS_VITS = False
else:
    HAS_VITS = False

# =========================
# LOAD PIPER
# =========================
voice_piper = None
syn_config = None
if HAS_PIPER and os.path.exists(PIPER_MODEL_PATH) and os.path.exists(PIPER_CONFIG_PATH):
    try:
        print(f"📂 Loading Piper from {PIPER_MODEL_PATH}")
        try:
            voice_piper = PiperVoice.load(PIPER_MODEL_PATH, config_path=PIPER_CONFIG_PATH, use_cuda=True)
            print("✅ Piper ready (CUDA)")
        except Exception as e:
            print(f"⚠️ Piper CUDA fail ({e}), fallback CPU")
            voice_piper = PiperVoice.load(PIPER_MODEL_PATH, config_path=PIPER_CONFIG_PATH, use_cuda=False)
            print("✅ Piper ready (CPU)")

        syn_config = SynthesisConfig(
            volume=1.0,
            length_scale=float(getattr(voice_piper.config, "length_scale", 1.0)),
            noise_scale=float(getattr(voice_piper.config, "noise_scale", 1.0)),
            noise_w_scale=float(getattr(voice_piper.config, "noise_w", 1.0)),
            normalize_audio=False,
        )
    except Exception as e:
        print(f"❌ Lỗi load Piper: {e}")
        HAS_PIPER = False
else:
    HAS_PIPER = False

# =========================
# HÀM PHÁT ÂM THANH
# =========================
def play_vits(text: str) -> bool:
    if not (HAS_VITS and tokenizer and vits_model and vits_sr):
        print("⚠️ VITS chưa sẵn sàng.")
        return False
    try:
        inputs = tokenizer(text, return_tensors="pt")
        if DEVICE == "cuda":
            inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
        with torch.no_grad():
            output = vits_model(**inputs).waveform
        waveform = output.cpu().numpy().squeeze().astype(np.float32)
        sd.play(waveform, samplerate=vits_sr)
        sd.wait()
        return True
    except Exception as e:
        print(f"❌ VITS error: {e}")
        return False

def play_piper(text: str) -> bool:
    if not (HAS_PIPER and voice_piper and syn_config):
        print("⚠️ Piper chưa sẵn sàng.")
        return False
    try:
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wav_file:
            voice_piper.synthesize_wav(text, wav_file, syn_config=syn_config)
        buf.seek(0)
        data, sr = sf.read(buf, dtype="float32")
        sd.play(data, samplerate=sr)
        sd.wait()
        return True
    except Exception as e:
        print(f"❌ Piper error: {e}")
        return False

def play_text(text: str) -> bool:
    if not text:
        return False
    if not audio_lock.acquire(blocking=False):
        print("⚠️ Đang phát, bỏ qua lệnh mới.")
        return False
    try:
        print(f"🔊 VOICE={current_voice} | TEXT={text}")
        if current_voice == 2:
            ok = play_piper(text)
            if not ok and HAS_VITS:
                print("↩️ Piper fail → fallback VITS")
                ok = play_vits(text)
            return ok
        else:
            ok = play_vits(text)
            if not ok and HAS_PIPER:
                print("↩️ VITS fail → fallback Piper")
                ok = play_piper(text)
            return ok
    finally:
        audio_lock.release()

# =========================
# CHUYỂN GIỌNG (BẬT/TẮT)
# =========================
def send_voice_ack(robot_code, voice, ok, message=None):
    try:
        if hub_connection:
            hub_connection.send("AckVoice", [robot_code or MY_ROBOT_CODE, int(voice), bool(ok), message])
            print(f"↖️ Sent AckVoice: robot={robot_code or MY_ROBOT_CODE}, voice={voice}, ok={ok}")
    except Exception as e:
        print(f"❌ Cannot send AckVoice: {e}")

def set_voice(new_voice: int, robot_code=None):
    global current_voice
    if new_voice == 1:
        if not HAS_VITS:
            print("❌ Không thể bật VITS: engine chưa sẵn sàng.")
            send_voice_ack(robot_code, 1, False, "VITS not available")
            return
        current_voice = 1
        print("🎚 Đổi giọng thành: 1 (VITS). Piper sẽ không được dùng khi phát.")
        send_voice_ack(robot_code, 1, True, "OK")
    elif new_voice == 2:
        if not HAS_PIPER:
            print("❌ Không thể bật Piper: engine chưa sẵn sàng.")
            send_voice_ack(robot_code, 2, False, "Piper not available")
            return
        current_voice = 2
        print("🎚 Đổi giọng thành: 2 (Piper). VITS sẽ không được dùng khi phát.")
        send_voice_ack(robot_code, 2, True, "OK")
    else:
        print(f"⚠️ Voice không hợp lệ: {new_voice}")
        send_voice_ack(robot_code, new_voice, False, "Invalid voice")

# =========================
# SIGNALR HANDLERS
# =========================
def on_receive_tts(arguments):
    try:
        if not arguments:
            print("⚠️ Nhận ReceiveTTS nhưng arguments rỗng")
            return
        text = arguments[0]
        print(f"📩 ReceiveTTS: {text}")
        play_text(text)
    except Exception as e:
        print(f"❌ Error ReceiveTTS: {e}")

def on_set_voice(arguments):
    try:
        payload = arguments[0] if arguments else None
        voice = None
        robot_code = None

        if isinstance(payload, dict):
            voice = int(payload.get("voice", 0))
            robot_code = payload.get("robotCode")
        else:
            voice = int(payload)

        # Nếu server gửi robotCode và client có MY_ROBOT_CODE thì chỉ xử lý nếu khớp
        if robot_code and MY_ROBOT_CODE and robot_code != MY_ROBOT_CODE:
            print(f"ℹ️ Bỏ qua SetVoice cho robot khác: {robot_code}")
            return

        set_voice(voice, robot_code)
    except Exception as e:
        print(f"❌ Error SetVoice: {e}")
        send_voice_ack(None, 0, False, f"Exception: {e}")

def setup_signalr():
    global hub_connection
    print(f"🌐 Connect SignalR: {SIGNALR_HUB_URL}")
    hub_connection = (
        HubConnectionBuilder()
        .with_url(SIGNALR_HUB_URL)
        .configure_logging(logging.ERROR)
        .with_automatic_reconnect(
            {"type": "raw", "keep_alive_interval": 10, "reconnect_interval": 5, "max_attempts": 10}
        )
        .build()
    )
    hub_connection.on("ReceiveTTS", on_receive_tts)
    hub_connection.on("SetVoice", on_set_voice)
    try:
        hub_connection.start()
        print("✅ Connected TTS Hub")
        # Gửi ACK trạng thái khởi động với giọng mặc định = 1 (VITS)
        send_voice_ack(MY_ROBOT_CODE, current_voice, True, "Boot OK (default=VITS)")
    except Exception as e:
        print(f"❌ Cannot connect TTS Hub: {e}")

    # giữ kết nối sống
    while True:
        time.sleep(2)

# =========================
# API LOCAL TEST
# =========================
@app.route("/speak", methods=["POST"])
def speak():
    data = request.get_json(force=True, silent=True) or {}
    text = data.get("text", "")
    ok = play_text(text)
    return (jsonify({"status": "success"}), 200) if ok else (jsonify({"status": "error"}), 500)

@app.route("/voice", methods=["POST"])
def voice_local():
    """Đổi giọng từ REST local: {"voice": 1|2} (chỉ để test nhanh)"""
    data = request.get_json(force=True, silent=True) or {}
    v = int(data.get("voice", 0))
    set_voice(v, MY_ROBOT_CODE or None)
    return jsonify({"current_voice": current_voice})

# =========================
# MAIN
# =========================
if __name__ == "__main__":
    # Khởi động với giọng 1 = VITS
    print("🚀 TTS Server (VITS + Piper) port 5000, default voice = 1 (VITS)")
    t = threading.Thread(target=setup_signalr, daemon=True)
    t.start()
    app.run(host="0.0.0.0", port=5000)
