import sounddevice as sd
import numpy as np
import wavio
import tempfile
import os

def list_input_devices():
    print("🎧 Danh sách thiết bị input khả dụng:")
    for idx, device in enumerate(sd.query_devices()):
        if device['max_input_channels'] > 0:
            print(f"{idx}: {device['name']} - {device['max_input_channels']} channel(s)")

def record_audio(seconds=5):
    try:
        list_input_devices()
        device_index = int(input("🎤 Chọn số thiết bị bạn muốn ghi âm: "))
        samplerate = int(sd.query_devices(device_index)['default_samplerate'])
        print(f"🎙️ Đang ghi âm ({seconds}s) với mic: {sd.query_devices(device_index)['name']} @ {samplerate}Hz...")
        
        audio_data = sd.rec(int(seconds * samplerate), 
                            samplerate=samplerate, 
                            channels=1, 
                            dtype='int16', 
                            device=device_index)
        sd.wait()
        
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        wavio.write(temp_file.name, audio_data, samplerate, sampwidth=2)
        print(f"✅ Ghi âm xong, lưu tại: {temp_file.name}")
        return temp_file.name
    except Exception as e:
        print("⚠️ Không thể ghi âm:", e)
        return None

if __name__ == "__main__":
    while True:
        duration = input("🎤 Nhập thời gian ghi âm (giây, mặc định=5, nhập 'q' để thoát): ").strip()
        if duration.lower() == 'q':
            break
        duration = int(duration) if duration else 5
        audio_path = record_audio(duration)
        if audio_path:
            print("🎵 Bạn đã có file ghi âm:", audio_path)
