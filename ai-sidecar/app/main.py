from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Optional, List
from app.engines.trust_engine import calculate_trust_score

app = FastAPI(title="AI Intelligence & Routing Sidecar")

class OCRResultsSchema(BaseModel):
    ocr_confidence: float = Field(..., description="Average confidence score from OCR service")
    tampering_detected: bool = Field(..., description="Whether receipt document tampering was detected")

class ReconResultsSchema(BaseModel):
    status: str = Field(..., description="Reconciliation status (e.g. VERIFIED, MISMATCH)")
    mismatch_amount: float = Field(..., description="Discrepancy amount between bank and claim")

class EvaluationInputSchema(BaseModel):
    employee_id: int
    current_trust_score: int
    claim_id: int
    ocr_results: OCRResultsSchema
    recon_results: ReconResultsSchema
    policy_violations_count: int
    outside_business_hours: bool
    is_duplicate: Optional[bool] = False
    anomaly_watch_level: Optional[bool] = False
    anomaly_major_variance: Optional[bool] = False
    rejection_state: Optional[bool] = False
    dispute_resolved_favorably: Optional[bool] = False

class EvaluationResponseSchema(BaseModel):
    claim_id: int
    adjusted_trust_score: int
    recommended_route: str
    anomaly_status: str
    applied_rules: List[str]

@app.post("/api/v1/evaluate-claim", response_model=EvaluationResponseSchema)
async def evaluate_claim(payload: EvaluationInputSchema):
    # Call core scoring algorithm
    adjusted_score, route, applied_rules = calculate_trust_score(
        current_score=payload.current_trust_score,
        ocr_confidence=payload.ocr_results.ocr_confidence,
        tampering_detected=payload.ocr_results.tampering_detected,
        recon_status=payload.recon_results.status,
        mismatch_amount=payload.recon_results.mismatch_amount,
        policy_violations=payload.policy_violations_count,
        outside_business_hours=payload.outside_business_hours,
        is_duplicate=payload.is_duplicate,
        anomaly_watch_level=payload.anomaly_watch_level,
        anomaly_major_variance=payload.anomaly_major_variance,
        rejection_state=payload.rejection_state,
        dispute_resolved_favorably=payload.dispute_resolved_favorably
    )

    # Determine anomaly flag
    anomaly_status = "NORMAL"
    if payload.ocr_results.tampering_detected:
        anomaly_status = "TAMPERED"
    elif payload.anomaly_major_variance:
        anomaly_status = "ANOMALOUS"
    elif payload.anomaly_watch_level or payload.recon_results.status == "MISMATCH":
        anomaly_status = "WARNING"

    return {
        "claim_id": payload.claim_id,
        "adjusted_trust_score": adjusted_score,
        "recommended_route": route,
        "anomaly_status": anomaly_status,
        "applied_rules": applied_rules
    }
