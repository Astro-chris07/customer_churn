from pydantic import BaseModel
from typing import List, Optional, Any

class ChatRequest(BaseModel):
    user_message: str
    churn_metrics: Optional[dict] = None
    top_risks: Optional[List[dict]] = None

class ChatResponse(BaseModel):
    response: str

class ReportRequest(BaseModel):
    churn_metrics: Optional[dict] = None
    top_risks: Optional[List[dict]] = None
    csv_columns: Optional[List[str]] = None

class ReportResponse(BaseModel):
    report_markdown: str
