import sounddevice as sd
import numpy as np
import wavio
import tempfile
import google.generativeai as genai
import pyttsx3
import os

# ================================
# 1️⃣ Cấu hình API key
# ================================
genai.configure(api_key="AIzaSyA5SFvjer3l7zTjwUP5CMo17LzKuvnoUG8")  # 👈 đổi key thật của bạn

# ================================
# 2️⃣ Chọn mic và ghi âm
# ================================
MIC_INDEX = 11  # 👈 Microphone (USBZH11S) - 1 channel(s)
SAMPLERATE = 44100  # 16000 có thể lỗi trên nhiều mic, 44100 an toàn hơn

def record_audio(seconds=5):
    try:
        device_info = sd.query_devices(MIC_INDEX)
        print(f"🎙️ Đang ghi âm ({seconds}s) với mic: {device_info['name']} @ {SAMPLERATE}Hz...")

        audio_data = sd.rec(
            int(seconds * SAMPLERATE),
            samplerate=SAMPLERATE,
            channels=1,
            dtype='int16',
            device=MIC_INDEX
        )
        sd.wait()

        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        wavio.write(temp_file.name, audio_data, SAMPLERATE, sampwidth=2)
        print(f"✅ Ghi âm xong, lưu tại: {temp_file.name}")
        return temp_file.name

    except Exception as e:
        print("⚠️ Lỗi khi ghi âm:", e)
        print("👉 Kiểm tra lại thiết bị mic hoặc đổi MIC_INDEX sang thiết bị khác.")
        return None

# ================================
# 3️⃣ Gửi dữ liệu audio lên Gemini
# ================================
def send_audio_to_gemini(audio_path):
    if not audio_path:
        return "Không có file âm thanh hợp lệ để gửi."

    print("🤖 Đang gửi dữ liệu lên Gemini...")
    model = genai.GenerativeModel("gemini-2.5-flash")

    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    try:
        response = model.generate_content([
            {"mime_type": "audio/wav", "data": audio_bytes},
            "Nghe đoạn ghi âm này, hiểu ý nghĩa và trả lời như một người tư vấn, phản hồi câu hỏi hoặc nội dung trong đoạn ghi âm đó. Trả lời bằng văn bản."
        ])
        return response.text
    except Exception as e:
        return f"Lỗi khi gửi lên Gemini: {e}"

# ================================
# 4️⃣ Đọc lại kết quả bằng giọng nói
# ================================
def speak_text(text):
    if not text:
        print("Không có nội dung để phát.")
        return
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()

# ================================
# 5️⃣ Main loop
# ================================
if __name__ == "__main__":
    while True:
        duration = input("🎤 Nhập thời gian ghi âm (giây, mặc định=5, nhập 'q' để thoát): ").strip()
        if duration.lower() == 'q':
            break
        duration = int(duration) if duration else 5

        audio_path = record_audio(duration)
        if not audio_path:
            continue

        try:
            text_response = send_audio_to_gemini(audio_path)
            print("🤖 Gemini trả lời:", text_response)
            speak_text(text_response)
        except Exception as e:
            print("⚠️ Lỗi:", e)
        finally:
            if audio_path and os.path.exists(audio_path):
                os.remove(audio_path)
