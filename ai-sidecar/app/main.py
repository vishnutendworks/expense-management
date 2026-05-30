from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Import your AI engines
from app.engines.trust_engine import calculate_trust_score
from app.anomaly_guard import analyze_expense_patterns

app = FastAPI(title="AI Intelligence & Routing Sidecar")

# --- CONTRACT SCHEMAS (Validated) ---
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

# --- AI FEATURE SCHEMAS ---
class ExpenseLine(BaseModel):
    employee_role: str
    expense_date: str
    amount: float
    category: str

class PolicyEvaluation(BaseModel):
    status_color: str
    message: str

# New Schemas for the Anomaly Guard Engine
class ExpenseRecord(BaseModel):
    date: str
    merchant: str
    amount: float
    category: str

class AnomalyRequest(BaseModel):
    new_expense: ExpenseRecord
    historical_data: List[ExpenseRecord]


# --- ROUTING ENDPOINT ---
@app.post("/api/v1/evaluate-claim", response_model=EvaluationResponseSchema)
async def evaluate_claim(payload: EvaluationInputSchema):
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

# --- AI FEATURE 2: REAL-TIME POLICY COACH ---
@app.post("/api/v1/policy/evaluate-line", response_model=PolicyEvaluation)
async def evaluate_policy_line(expense: ExpenseLine):
    MAX_LIMIT = 5000.00
    WARNING_THRESHOLD = 4000.00
    BACKDATE_LIMIT_DAYS = 30
    
    try:
        exp_date = datetime.strptime(expense.expense_date, "%Y-%m-%d")
        days_old = (datetime.now() - exp_date).days
        if days_old > BACKDATE_LIMIT_DAYS:
            return PolicyEvaluation(status_color="Red", message=f"This exceeds your limit by {days_old - BACKDATE_LIMIT_DAYS} days and will require manager justification.")
    except ValueError:
        return PolicyEvaluation(status_color="Red", message="Invalid date format.")

    if expense.amount > MAX_LIMIT:
        return PolicyEvaluation(status_color="Red", message=f"This exceeds your limit by {expense.amount - MAX_LIMIT} and will require manager justification or may be partially reimbursed.")
    if expense.amount >= WARNING_THRESHOLD:
        return PolicyEvaluation(status_color="Yellow", message="This expense brings you close to your monthly limit.")
    
    return PolicyEvaluation(status_color="Green", message="Within your allowed limit.")

# --- AI FEATURE 3: DUPLICATE & ANOMALY GUARD ---
@app.post("/api/v1/policy/check-anomaly")
async def check_anomaly(request: AnomalyRequest):
    # Convert Pydantic models to standard dictionaries for the math engine
    new_exp_dict = request.new_expense.model_dump()
    history_dicts = [item.model_dump() for item in request.historical_data]
    
    # Run the standard deviation math
    result = analyze_expense_patterns(new_exp_dict, history_dicts)
    
    return result