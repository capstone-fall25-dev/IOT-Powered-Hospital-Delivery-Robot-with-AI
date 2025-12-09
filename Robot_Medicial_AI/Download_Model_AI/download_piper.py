import os
import urllib.request
import ssl

# Bỏ qua xác thực SSL để tránh lỗi mạng
ssl._create_default_https_context = ssl._create_unverified_context

# Thư mục hiện tại và thư mục lưu model
current_folder = os.getcwd()
save_dir = os.path.join(current_folder, "model_piper")
os.makedirs(save_dir, exist_ok=True)

# --- LINK CHUẨN (VIVOS - x_low - MIỀN NAM) ---
# Link trực tiếp từ HuggingFace (đã test chạy ổn định)
MODEL_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/vi/vi_VN/vivos/x_low/vi_VN-vivos-x_low.onnx?download=true"
CONFIG_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/vi/vi_VN/vivos/x_low/vi_VN-vivos-x_low.onnx.json?download=true"

print(f"📂 Đang tải về thư mục: {save_dir}")
print("⏳ Đang tải Model Piper Vivos (nhẹ, giọng miền Nam)...")

def download_file(url, filename):
    try:
        print(f"   ⬇️ Downloading {filename}...")
        save_path = os.path.join(save_dir, filename)
        urllib.request.urlretrieve(url, save_path)
        print(f"      ✅ OK: {save_path}")
    except Exception as e:
        print(f"❌ Lỗi tải {filename}: {e}")
        # Fallback: Gợi ý lệnh wget nếu python tải thất bại
        print(f"      👉 Lệnh thủ công: wget -O {filename} \"{url}\"")

# Tải 2 file cần thiết
download_file(MODEL_URL, "model.onnx")
download_file(CONFIG_URL, "model.onnx.json")

print("\n------------------------------------------------")
print("✅ TẢI HOÀN TẤT! Bạn hãy chạy: python tts_server.py")
print("------------------------------------------------")