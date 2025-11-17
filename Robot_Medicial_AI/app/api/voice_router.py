from fastapi import APIRouter, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
import io
import wave
import numpy as np

from app.services.gemini_service import transcribe_and_answer
from app.services.tts_service import text_to_mp3

router = APIRouter()


# --- WAV helper functions ---
def is_valid_wav(byte_data: bytes) -> bool:
    try:
        with wave.open(io.BytesIO(byte_data), "rb"):
            return True
    except wave.Error:
        return False


def wav_info(byte_data: bytes) -> dict:
    with wave.open(io.BytesIO(byte_data), "rb") as wf:
        n_channels = wf.getnchannels()
        sr = wf.getframerate()
        n_frames = wf.getnframes()
        duration = n_frames / sr
    return {
        "channels": n_channels,
        "sample_rate": sr,
        "frames": n_frames,
        "duration": duration
    }


def bytes_to_wav(byte_data: bytes) -> tuple[np.ndarray, int]:
    with wave.open(io.BytesIO(byte_data), "rb") as wf:
        sr = wf.getframerate()
        frames = wf.readframes(wf.getnframes())
        sampwidth = wf.getsampwidth()
        if sampwidth == 2:  # int16
            audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        elif sampwidth == 1:  # uint8
            audio = (np.frombuffer(frames, dtype=np.uint8).astype(np.float32) - 128) / 128.0
        else:
            raise ValueError(f"Unsupported sample width: {sampwidth}")
    return audio, sr


# --- API Endpoint ---
@router.post("/voice")
async def voice_endpoint(file: UploadFile):
    wav_bytes = await file.read()

    if not is_valid_wav(wav_bytes):
        raise HTTPException(status_code=400, detail="File is not a valid WAV audio")

    info = wav_info(wav_bytes)
    print(f"Received WAV: {info}")  # có thể log info

    # Gọi AI để transcribe + trả lời
    ai_text = transcribe_and_answer(wav_bytes)

    # Chuyển text sang mp3
    mp3_bytes = await text_to_mp3(ai_text)

    return StreamingResponse(
        iter([mp3_bytes]),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=robot.mp3"}
    )
