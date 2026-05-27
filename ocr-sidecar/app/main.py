from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import re

app = FastAPI(title="OCR Document Processing Sidecar")

class OCRResponseData(BaseModel):
    merchant_name: str
    expense_date: str
    total_amount: float
    tax_amount: float
    currency_code: str
    ocr_confidence: float
    tampering_detected: bool

class OCRResponse(BaseModel):
    status: str
    extracted_data: OCRResponseData

@app.post("/api/v1/ocr/parse", response_model=OCRResponse)
async def parse_receipt(file: UploadFile = File(...)):
    filename = file.filename.lower()
    
    # Defaults
    merchant = "Ola Cabs"
    date = "2026-05-21"
    amount = 460.00
    tax = 21.90
    currency = "INR"
    confidence = 0.94
    tampering = False

    # Dynamic parsing for testing purposes:
    # 1. If filename contains "tamper", trigger tampering detection
    if "tamper" in filename:
        tampering = True
        confidence = 0.40
    
    # 2. If filename contains "low", lower confidence
    if "low" in filename:
        confidence = 0.35

    # 3. Try to extract amount from filename if present (e.g. receipt_500.jpg -> 500.00)
    amount_match = re.search(r'receipt_(\d+)', filename)
    if amount_match:
        amount = float(amount_match.group(1))

    return {
        "status": "success",
        "extracted_data": {
            "merchant_name": merchant,
            "expense_date": date,
            "total_amount": amount,
            "tax_amount": tax,
            "currency_code": currency,
            "ocr_confidence": confidence,
            "tampering_detected": tampering
        }
    }
