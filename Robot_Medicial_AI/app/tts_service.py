import edge_tts
import uuid
import asyncio

OUTPUT_DIR = "storage/output"

async def tts_generate(text: str, voice: str = "vi-VN-HoaiMyNeural"):
    filename = f"{uuid.uuid4()}.mp3"
    out_path = f"{OUTPUT_DIR}/{filename}"

    tts = edge_tts.Communicate(text, voice=voice)
    await tts.save(out_path)

    return out_path, filename
