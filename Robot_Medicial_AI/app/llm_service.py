import google.generativeai as genai
import os

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

model = genai.GenerativeModel("gemini-2.0-flash")

def chat_llm(text: str) -> str:
    resp = model.generate_content(text)
    return resp.text
