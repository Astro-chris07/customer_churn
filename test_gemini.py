
import google.generativeai as genai
import sys

GENAI_API_KEY = "AIzaSyDn3ikmzHv2yyKB8XW1jssvP2XJBs7q-hA"

with open('gemini_test_result.txt', 'w', encoding='utf-8') as f:
    try:
        f.write(f"Configuring with key: {GENAI_API_KEY[:5]}...\n")
        genai.configure(api_key=GENAI_API_KEY)
        
        f.write("Listing models...\n")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                f.write(f"Found: {m.name}\n")

        f.write("\nAttempting generation with gemini-flash-latest...\n")
        model = genai.GenerativeModel("gemini-flash-latest")
        response = model.generate_content("Hello")
        f.write(f"Response: {response.text}\n")
        f.write("SUCCESS\n")

    except Exception as e:
        f.write(f"ERROR: {type(e).__name__}: {e}\n")
