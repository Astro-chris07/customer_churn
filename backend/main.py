from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import uvicorn
from model import predict, get_model
import json
import google.generativeai as genai
from pydantic import BaseModel
from schemas import ChatRequest, ChatResponse, ReportRequest, ReportResponse
import os
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

app = FastAPI(title="Customer Churn Prediction API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
# Configure Gemini
GENAI_API_KEY = os.getenv("GENAI_API_KEY")
if not GENAI_API_KEY:
    # Fallback to the hardcoded one (which is currently rate limited, but better than crashing immediately if they don't have one)
    # Or better, just print a warning.
    print("WARNING: GENAI_API_KEY not found in .env, using default shared key (may be rate limited).")
    GENAI_API_KEY = "AIzaSyBl5JCWGd8EG9xRSHam21fGjcL-zQUnaPg"

print(f"DEBUG: Active API Key: {GENAI_API_KEY[:10]}... (ends with {GENAI_API_KEY[-4:]})")
genai.configure(api_key=GENAI_API_KEY)

# Initialize Model with System Instruction
generation_config = {
  "temperature": 0.7,
  "top_p": 0.95,
  "top_k": 64,
  "max_output_tokens": 8192,
}

gemini_model = genai.GenerativeModel(
  model_name="gemini-flash-lite-latest",
  generation_config=generation_config,
  system_instruction="""You are 'Persona', a helpful Data Science AI Assistant for a Customer Churn application.

  CORE GUIDELINES:
  1. **Structure is Key**: Use **bolding** for important terms, *italics* for emphasis, and bullet points for lists. NEVER output a wall of text.
  2. **Be Concise yet Helpful**: Keep answers digestible. Use short paragraphs.
  3. **Context Aware**: If user says "Hi", be brief. If they ask for analysis, use a structured format (e.g., "Here's what I found: [Bullet points]").
  4. **Tone**: conversational, professional, and encouraging.
  """
)

@app.on_event("startup")
async def startup_event():
    # Warm up model on startup
    try:
        get_model()
    except Exception as e:
        print(f"Failed to load model on startup: {e}")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/predict")
async def predict_churn(file: UploadFile = File(...)):
    print(f"DEBUG: Received file upload request: {file.filename}")
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV or Excel file.")
    
    try:
        print("DEBUG: Reading file contents...")
        contents = await file.read()
        print(f"DEBUG: File contents read. Size: {len(contents)} bytes")
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        print(f"DEBUG: DataFrame loaded. Shape: {df.shape}")
        if df.empty:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")
            
        print("DEBUG: Calling model.predict()...")
        probabilities, predictions = predict(df)
        print("DEBUG: Model prediction complete.")
        
        # Add results to dataframe for return
        result_df = df.copy()
        result_df["churn_probability"] = probabilities
        result_df["churn_prediction"] = predictions
        
        # Convert to records for JSON response
        results = result_df.to_dict(orient="records")
        
        # Calculate summary stats
        churn_rate = float(predictions.mean())
        
        return {
            "summary": {
                "total_customers": len(df),
                "churn_rate": churn_rate,
                "high_risk_count": int(predictions.sum())
            },
            "results": results
        }
        
    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import StreamingResponse

@app.post("/chat")
async def chat_advisor(request: ChatRequest):
    async def generate_response():
        try:
            # Construct the context
            context_str = ""
            if request.churn_metrics:
                context_str += f"\n[Current Analysis Context]\nChurn Rate: {request.churn_metrics.get('churn_rate', 0):.2%}\nAt-Risk Customers: {request.churn_metrics.get('high_risk_count', 0)}\nTotal Customers: {request.churn_metrics.get('total_customers', 0)}\n"
            
            if request.top_risks and len(request.top_risks) > 0:
                context_str += "\n[Sample High-Risk Profiles]\n"
                for idx, risk in enumerate(request.top_risks[:3]):
                    context_str += f"- Customer {idx+1}: {risk.get('contract', 'Unknown')} contract, Tenure: {risk.get('tenure', 0)} months, Prob: {risk.get('churn_probability', 0):.2%}\n"

            prompt = f"{context_str}\nUser Question: {request.user_message}"
            
            chat_session = gemini_model.start_chat(history=[])
            response_stream = chat_session.send_message(prompt, stream=True)
            
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            print(f"GenAI Error: {e}")
            yield "I'm having trouble connecting to my AI brain right now. Please try again later."

    return StreamingResponse(generate_response(), media_type="text/plain")

@app.post("/generate_report")
async def generate_report(request: ReportRequest):
    async def generate_response():
        try:
            # Construct the context
            context_str = ""
            if request.churn_metrics:
                context_str += f"\n[Analysis Context]\nGlobal Churn Rate: {request.churn_metrics.get('churn_rate', 0):.2%}\nHigh Risk Volume: {request.churn_metrics.get('high_risk_count', 0)} / {request.churn_metrics.get('total_customers', 0)} total customers.\n"
            
            if request.top_risks and len(request.top_risks) > 0:
                context_str += "\n[Top High-Risk Customer Profiles Pattern]\n"
                # Send up to 10 profiles to give the AI good context
                for idx, risk in enumerate(request.top_risks[:10]):
                    context_str += f"- Customer {idx+1}: Contract={risk.get('contract', 'Unk')}, Tenure={risk.get('tenure', 0)}, Charges={risk.get('monthlycharges', risk.get('monthly_charges', 'Unk'))}, Prob={risk.get('churn_probability', 0):.2%}\n"
            
            if request.csv_columns:
                context_str += f"\n[Available Data Points]: {', '.join(request.csv_columns)}\n"

            prompt = f"""
            {context_str}
            
            Write an **Executive Churn Report** in a **natural, human-written style**. 
            
            **Tone Instructions:**
            - Write like a thoughtful human consultant, not a robot.
            - Use flowing paragraphs and narrative structures rather than just endless bullet points.
            - Be direct, professional, yet conversational.
            - Avoid generic AI phrases like "In conclusion" or "Based on the data". Start sentences directly.
            
            **Structure:**
            1. **Executive Summary**: A brief, punchy overview of the situation.
            2. **Risk & Feature Analysis (SHAP-style)**:
               - Explain the churn prediction using **SHAP value concepts** by identifying key features that increased or decreased churn risk based on the attached profiles.
               - Categorize the risk levels clearly.
               - Suggest targeted retention strategies in business-friendly language.
            3. **The "Why" (Business Insights)**: tell the story of *why* people are leaving (e.g., "It appears our newer customers on month-to-month contracts are feeling the pinch...").
            4. **Proposed Solutions**: Concrete advice.
            5. **Data Recommendations**: What else do we need?
            
            Format in clean Markdown.
            """
            
            chat_session = gemini_model.start_chat(history=[])
            response_stream = chat_session.send_message(prompt, stream=True)
            
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            print(f"GenAI Report Error: {e}")
            yield f"## Error Generating Report\n\n**Technical Details:**\n{str(e)}"

    return StreamingResponse(generate_response(), media_type="text/plain")

from email_utils import generate_pdf_from_markdown, send_email_with_pdf

# ... (schemas need update too, I'll do that in a separate replacement or inline schema)

class EmailRequest(BaseModel):
    email: str
    report_markdown: str

@app.post("/send_report")
async def send_report(request: EmailRequest):
    try:
        # 1. Generate PDF
        pdf_bytes = generate_pdf_from_markdown(request.report_markdown)
        
        # 2. Send Email
        success = send_email_with_pdf(request.email, pdf_bytes)
        
        if success:
            return {"status": "success", "message": "Email sent successfully!"}
        else:
            # If mock success (no creds) it returns true in utils, returns false only on exception
            raise HTTPException(status_code=500, detail="Failed to send email through SMTP server.")
            
    except Exception as e:
        print(f"Email Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
