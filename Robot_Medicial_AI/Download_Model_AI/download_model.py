import os
from transformers import VitsModel, AutoTokenizer

# Lấy chính xác thư mục bạn đang đứng (tts_project)
current_folder = os.getcwd()

# Tạo một thư mục con tên là "model_vn" để chứa file cho gọn
save_directory = os.path.join(current_folder, "model_vn")

print(f"--- BẮT ĐẦU TẢI ---")
print(f"📂 Model sẽ được lưu vào: {save_directory}")

try:
    # Tải từ mạng
    print("⏳ Đang tải từ HuggingFace (có thể mất vài phút)...")
    model = VitsModel.from_pretrained("facebook/mms-tts-vie")
    tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-vie")

    # Lưu vào thư mục local
    model.save_pretrained(save_directory)
    tokenizer.save_pretrained(save_directory)

    print("✅ ĐÃ TẢI XONG! Kiểm tra thư mục 'model_vn' nhé.")

except Exception as e:
    print(f"❌ Lỗi khi tải: {e}")