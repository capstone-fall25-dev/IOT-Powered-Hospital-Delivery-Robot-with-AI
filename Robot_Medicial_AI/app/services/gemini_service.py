import os
import google.generativeai as genai

api_key = os.getenv("GEMINI_KEY")
if not api_key:
    raise ValueError("Vui lòng thiết lập biến môi trường GEMINI_KEY")

genai.configure(api_key=api_key)

def transcribe_and_answer(wav_bytes):
    model = genai.GenerativeModel("gemini-2.5-flash")

    result = model.generate_content([
        {"mime_type": "audio/wav", "data": wav_bytes},
        "Nghe hiểu nội dung audio và trả lời nội dung theo ngữ cảnh trong audio đó."
    ])

    return result.text
