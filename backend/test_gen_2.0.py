import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load env explicitly
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

api_key = os.getenv("GENAI_API_KEY")
print(f"Key loaded: {api_key[:10]}... (len={len(api_key) if api_key else 0})")

genai.configure(api_key=api_key)

# Use the exact model name from main.py
MODEL_NAME = "gemini-2.5-flash"
print(f"Testing model: {MODEL_NAME}")

try:
    model = genai.GenerativeModel(MODEL_NAME)
    response = model.generate_content("Explain quantum computing in 5 words.")
    print("Success!")
    print(response.text)
except Exception as e:
    print(f"Generative Error: {e}")
