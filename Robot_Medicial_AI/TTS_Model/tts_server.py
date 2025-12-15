from flask import Flask, request, jsonify
from transformers import VitsModel, AutoTokenizer
import torch
import sounddevice as sd
import logging
import os
import threading
import time
import sys

# --- CÀI ĐẶT THÊM THƯ VIỆN NÀY ---
# pip install signalrcore
try:
    from signalrcore.hub_connection_builder import HubConnectionBuilder
except ImportError:
    print("❌ CHƯA CÀI THƯ VIỆN SIGNALR!")
    print("👉 Hãy chạy lệnh: pip install signalrcore")
    sys.exit(1)

app = Flask(__name__)

# --- CẤU HÌNH ---
# Lấy đường dẫn của thư mục chứa file code này
base_dir = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(base_dir, "model_vn")

# URL Của Backend (Hub)
SIGNALR_HUB_URL = "https://medigorobot.online/hubs/ttsHub" 

if not os.path.exists(MODEL_PATH):
    print(f"❌ LỖI: Không tìm thấy thư mục model tại: {MODEL_PATH}")
    print("👉 Hãy chạy file download_model.py trước để tải model về!")
    exit(1)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
SAMPLE_RATE = None 

# --- KHỞI TẠO MODEL ---
print(f"📂 Đang load model từ đĩa cứng: {MODEL_PATH}")
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = VitsModel.from_pretrained(MODEL_PATH).to(DEVICE)
    SAMPLE_RATE = model.config.sampling_rate
    print(f"✅ Model AI sẵn sàng. Device: {DEVICE}")
except Exception as e:
    print(f"❌ Lỗi tải model offline: {e}")
    exit(1)

# Biến khóa để tránh 2 luồng đọc cùng lúc gây lỗi âm thanh
audio_lock = threading.Lock()

def play_audio(text):
    """Hàm xử lý text thành âm thanh và phát ra loa"""
    if not text: return False
    
    # Dùng Lock để đảm bảo chỉ 1 giọng nói phát ra tại 1 thời điểm
    if not audio_lock.acquire(blocking=False):
        print("⚠️ Robot đang nói, bỏ qua lệnh mới để tránh chồng lấn.")
        return False

    try:
        print(f"🔊 ĐANG ĐỌC: {text}")
        inputs = tokenizer(text, return_tensors="pt").to(DEVICE)
        with torch.no_grad():
            output = model(**inputs).waveform
        
        waveform = output.cpu().numpy().squeeze()
        sd.play(waveform, samplerate=SAMPLE_RATE)
        sd.wait()
        return True
    except Exception as e:
        print(f"❌ Lỗi âm thanh: {e}")
        return False
    finally:
        audio_lock.release()

# --- PHẦN SIGNALR CLIENT (LẮNG NGHE TỪ SERVER ONLINE) ---
def setup_signalr():
    """Thiết lập kết nối tới C# Backend"""
    print(f"🌐 Đang kết nối tới SignalR Hub: {SIGNALR_HUB_URL} ...")
    
    hub_connection = HubConnectionBuilder()\
        .with_url(SIGNALR_HUB_URL)\
        .configure_logging(logging.ERROR)\
        .with_automatic_reconnect({
            "type": "raw",
            "keep_alive_interval": 10,
            "reconnect_interval": 5,
            "max_attempts": 5
        })\
        .build()

    # Đăng ký sự kiện: Khi Server gửi "ReceiveTTS", hàm này sẽ chạy
    hub_connection.on("ReceiveTTS", on_receive_tts_message)

    try:
        hub_connection.start()
        print("✅ Đã kết nối thành công tới Server MedigoRobot!")
    except Exception as e:
        print(f"❌ Không thể kết nối tới Server: {e}")

    # Giữ kết nối luôn sống
    while True:
        time.sleep(1)

def on_receive_tts_message(arguments):
    """Hàm callback khi nhận được tin nhắn từ Server"""
    try:
        # arguments là một list, lấy phần tử đầu tiên là text
        text_received = arguments[0]
        print(f"📩 Nhận tín hiệu từ Server Online: {text_received}")
        play_audio(text_received)
    except Exception as e:
        print(f"❌ Lỗi xử lý tin nhắn SignalR: {e}")

# --- API FLASK (GIỮ LẠI ĐỂ TEST LOCAL NẾU CẦN) ---
@app.route('/speak', methods=['POST'])
def speak():
    data = request.json
    text = data.get('text', '')
    if play_audio(text):
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "busy_or_error"}), 500

if __name__ == '__main__':
    # 1. Chạy SignalR ở một luồng riêng (Background Thread)
    signalr_thread = threading.Thread(target=setup_signalr, daemon=True)
    signalr_thread.start()

    # 2. Chạy Flask Server ở luồng chính
    print("🚀 Flask Server đang chạy local port 5000...")
    app.run(host='0.0.0.0', port=5000)