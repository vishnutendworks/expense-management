from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import httpx

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

class LiveAnomalyRequest(BaseModel):
    employee_id: int
    new_expense: ExpenseRecord

# --- AI FEATURE 4 SCHEMAS ---
class SmartHintRequest(BaseModel):
    policy_status: str
    risk_level: str
    recent_exceptions_count: int

class SmartHintResponse(BaseModel):
    policy_summary: str
    risk_summary: str
    history_summary: str
    suggested_action: str

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
async def check_anomaly(request: LiveAnomalyRequest):
    # 1. Fetch live historical data from Engineer 1's Django API
    django_url = f"http://localhost:8000/api/expenses/history/{request.employee_id}/"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(django_url, timeout=5.0)
            response.raise_for_status()  # Check for 4xx/5xx errors from Django
            django_claims = response.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Core platform unreachable: {e}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=response.status_code, detail="Error fetching history from Core")

    # 2. Transform Django's response into the format your math engine expects
    history_dicts = []
    for claim in django_claims:
        history_dicts.append({
            # Slice the datetime string to just get the YYYY-MM-DD
            "date": claim.get("created_at", "").split("T")[0], 
            "merchant": claim.get("title", "Unknown Vendor"),
            "amount": float(claim.get("total_amount", 0.0)),
            "category": "General" 
        })

    # 3. Convert the new incoming expense
    new_exp_dict = request.new_expense.model_dump()
    
    # 4. Run your statistical anomaly math!
    result = analyze_expense_patterns(new_exp_dict, history_dicts)
    
    return result

    # --- AI FEATURE 4: SMART APPROVAL HINTS ---
@app.post("/api/v1/policy/smart-hint", response_model=SmartHintResponse)
async def generate_smart_hint(request: SmartHintRequest):
    # Default assumptions
    policy_summary = "Compliant"
    risk_summary = "Normal"
    history_summary = "No prior policy violations in last 6 months"
    suggested_action = "Low risk and fully compliant - approval recommended"

    # Evaluate Policy Status
    if request.policy_status.lower() != "green":
        policy_summary = "Exception: Claim exceeds standard limits or backdate rules."
        suggested_action = "Review required - check justification for policy exception."

    # Evaluate Risk Level (Overrides policy suggestion if risk is high)
    if request.risk_level.lower() == "high":
        risk_summary = "High Risk: Unusual amount or frequency detected."
        suggested_action = "High variance detected - review receipts carefully before approving."
    elif request.risk_level.lower() == "watch":
        risk_summary = "Watch: Claim pattern deviates slightly from norm."

    # Evaluate History
    if request.recent_exceptions_count > 0:
        history_summary = f"{request.recent_exceptions_count} exceptions in recent history."
        if request.risk_level.lower() == "high":
            suggested_action = "High risk and frequent past exceptions - strict review advised."

    return SmartHintResponse(
        policy_summary=policy_summary,
        risk_summary=risk_summary,
        history_summary=history_summary,
        suggested_action=suggested_action
    )