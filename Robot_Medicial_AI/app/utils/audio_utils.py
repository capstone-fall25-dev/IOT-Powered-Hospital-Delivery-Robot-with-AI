# import wave
# import io
# import numpy as np


# def bytes_to_wav(byte_data):
#     """Convert WAV bytes → numpy array + sample_rate."""
#     buffer = io.BytesIO(byte_data)
#     with wave.open(buffer, "rb") as wf:
#         sr = wf.getframerate()
#         frames = wf.readframes(wf.getnframes())
#         audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32767.0
#     return audio, sr


# def wav_info(byte_data):
#     """Trả về thông tin cơ bản của file WAV."""
#     buffer = io.BytesIO(byte_data)
#     with wave.open(buffer, "rb") as wf:
#         return {
#             "channels": wf.getnchannels(),
#             "sample_rate": wf.getframerate(),
#             "frames": wf.getnframes(),
#             "duration": wf.getnframes() / wf.getframerate()
#         }


# def is_valid_wav(byte_data):
#     """Kiểm tra WAV hợp lệ."""
#     try:
#         buffer = io.BytesIO(byte_data)
#         with wave.open(buffer, "rb"):
#             return True
#     except:
#         return False
