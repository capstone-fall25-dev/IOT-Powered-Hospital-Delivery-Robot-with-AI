from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
import uuid
import os
import asyncio

from stt_service import transcribe_local
from llm_service import chat_llm
from tts_service import tts_generate

INPUT_DIR = "storage/input"

app = FastAPI()

@app.post("/converse")
async def converse(file: UploadFile = File(...)):
    # 1. Lưu file input
    input_name = f"{uuid.uuid4()}_{file.filename}"
    input_path = f"{INPUT_DIR}/{input_name}"

    with open(input_path, "wb") as f:
        f.write(await file.read())

    # 2. STT
    text = transcribe_local(input_path)

    # 3. LLM
    reply = chat_llm(text)

    # 4. TTS
    out_path, fname = await tts_generate(reply)

    # 5. Trả về audio file (mp3)
    return FileResponse(
        out_path,
        media_type="audio/mpeg",
        filename=fname
    )
