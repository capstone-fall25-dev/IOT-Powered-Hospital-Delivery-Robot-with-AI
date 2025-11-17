import edge_tts
from io import BytesIO

async def text_to_mp3(text):
    communicate = edge_tts.Communicate(text, "vi-VN-HoaiMyNeural")

    mp3_bytes = BytesIO()

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            mp3_bytes.write(chunk["data"])

    return mp3_bytes.getvalue()
