import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GENAI_API_KEY")
print(f"Loaded Key: {api_key[:10]}... (hidden)")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash')

try:
    response = model.generate_content("Hello, can you hear me?")
    print("Success! Response:")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
