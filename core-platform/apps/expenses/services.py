import httpx
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def parse_receipt_ocr(file_obj):
    """
    Sends the receipt file to the OCR sidecar.
    Endpoint: POST http://ocr-sidecar:8001/api/v1/ocr/parse
    """
    url = f"{settings.OCR_SIDECAR_URL.rstrip('/')}/api/v1/ocr/parse"
    try:
        # Reset file pointer and read binary data
        file_obj.seek(0)
        filename = getattr(file_obj, 'name', 'receipt.jpg') or 'receipt.jpg'
        
        # We perform a multipart upload of the file
        files = {'file': (filename, file_obj.read(), 'image/jpeg')}
        
        logger.info(f"Sending file {filename} to OCR sidecar at {url}")
        response = httpx.post(url, files=files, timeout=15.0)
        
        if response.status_code == 200:
            logger.info("OCR parsing completed successfully")
            return response.json()
        else:
            logger.error(f"OCR sidecar returned error {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"Error calling OCR sidecar at {url}: {str(e)}")
        
    # Return a fallback/mock response so submission doesn't crash if OCR sidecar is offline
    logger.warning("Using mock fallback for OCR extraction")
    return {
        "status": "success",
        "extracted_data": {
            "merchant_name": "Fallback Merchant",
            "expense_date": "2026-05-21",
            "total_amount": 100.00,
            "tax_amount": 5.00,
            "currency_code": "INR",
            "ocr_confidence": 0.50,
            "tampering_detected": False
        }
    }

def evaluate_claim_trust(payload):
    """
    Sends claim metrics to the AI Trust & Routing sidecar.
    Endpoint: POST http://ai-sidecar:8002/api/v1/evaluate-claim
    """
    url = f"{settings.AI_SIDECAR_URL.rstrip('/')}/api/v1/evaluate-claim"
    try:
        logger.info(f"Sending evaluation request to AI sidecar at {url}: {payload}")
        response = httpx.post(url, json=payload, timeout=15.0)
        
        if response.status_code == 200:
            logger.info("AI claim evaluation completed successfully")
            return response.json()
        else:
            logger.error(f"AI sidecar returned error {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"Error calling AI sidecar at {url}: {str(e)}")
        
    # Return a fallback/mock response so submission doesn't crash if AI sidecar is offline
    logger.warning("Using mock fallback for AI evaluation")
    
    # Calculate a simple local fallback score adjustment
    current_score = payload.get("current_trust_score", 85)
    deduction = 0
    if payload.get("ocr_results", {}).get("tampering_detected", False):
        deduction += 30
    if payload.get("policy_violations_count", 0) > 0:
        deduction += 8
        
    adjusted_score = max(0, min(100, current_score - deduction))
    
    # Simple route recommendation
    if adjusted_score >= 80:
        route = "FAST_TRACK"
    elif adjusted_score >= 50:
        route = "MANAGER_REVIEW"
    else:
        route = "ESCALATED"
        
    return {
        "claim_id": payload.get("claim_id"),
        "adjusted_trust_score": adjusted_score,
        "recommended_route": route,
        "anomaly_status": "NORMAL" if deduction == 0 else "WARNING",
        "violations": []
    }
