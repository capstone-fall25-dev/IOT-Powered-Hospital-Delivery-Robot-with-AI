import whisper
import uuid
import os

model = whisper.load_model("small")  # hoặc tiny/medium

def transcribe_local(filepath: str) -> str:
    result = model.transcribe(filepath, language="vi")
    return result["text"]
