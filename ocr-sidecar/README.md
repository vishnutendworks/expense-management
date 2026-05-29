# OCR Sidecar (Engineer 2)

Python 3.10 + FastAPI service that turns receipt images/PDFs into structured JSON for the Django core platform and AI trust engine.

## Endpoint

`POST /api/v1/ocr/parse` — multipart field name: `file`

Response contract:

```json
{
  "status": "success",
  "extracted_data": {
    "merchant_name": "Uber",
    "expense_date": "2026-05-27",
    "total_amount": 450.0,
    "tax_amount": 40.5,
    "currency_code": "INR",
    "ocr_confidence": 0.98,
    "tampering_detected": false
  }
}
```

## Local run (Docker)

1. Copy `../.env.example` to `../.env` and set `GEMINI_API_KEY`.
2. From repo root: `docker compose up -d ocr-sidecar`
3. Open [http://localhost:8001/docs](http://localhost:8001/docs) and upload a test receipt.

## Tests

```bash
cd ocr-sidecar
pip install -r requirements.txt
pytest -q
```

Tests mock Gemini so no API key is required for CI.
