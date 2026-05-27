import logging

logger = logging.getLogger(__name__)

def calculate_trust_score(
    current_score: int,
    ocr_confidence: float,
    tampering_detected: bool,
    recon_status: str,
    mismatch_amount: float,
    policy_violations: int,
    outside_business_hours: bool,
    is_duplicate: bool = False,
    anomaly_watch_level: bool = False,
    anomaly_major_variance: bool = False,
    rejection_state: bool = False,
    dispute_resolved_favorably: bool = False
) -> tuple[int, str, list[str]]:
    """
    Calculates the adjusted trust score and returns the recommended routing lane.
    Score is bounded strictly between 0 and 100.
    """
    score = current_score
    applied_rules = []
    
    # 1. Image Tampering Detection (-30)
    if tampering_detected:
        score -= 30
        applied_rules.append("Font inconsistency or metadata check indicates direct image tampering (-30)")
        
    # 2. Bank reconciliation mismatch (-20) vs perfect match (+3)
    if recon_status == "MISMATCH" or mismatch_amount > 0:
        score -= 20
        applied_rules.append("Bank statement reconciliation registers a mismatch outside parameters (-20)")
    elif recon_status == "VERIFIED" and mismatch_amount == 0.00:
        score += 3
        applied_rules.append("Bank statement reconciliation matches perfectly (+3)")
        
    # 3. OCR Confidence High (+1)
    if ocr_confidence >= 0.90:
        score += 1
        applied_rules.append("Receipt OCR matched with high confidence (+1)")
        
    # 4. Duplicate Check (-10)
    if is_duplicate:
        score -= 10
        applied_rules.append("User submits a confirmed duplicate record entry (-10)")
        
    # 5. Anomaly checks (-5 / -15)
    if anomaly_major_variance:
        score -= 15
        applied_rules.append("Anomaly check flags a major high-level variance indicator (-15)")
    elif anomaly_watch_level:
        score -= 5
        applied_rules.append("Anomaly check flags an operational watch level indicator (-5)")
        
    # 6. Business Hours Check (-3)
    if outside_business_hours:
        score -= 3
        applied_rules.append("Submission timestamp lands outside standard business operational windows (-3)")
        
    # 7. Policy Validation Failures (-8)
    if policy_violations > 0:
        score -= 8 * policy_violations
        applied_rules.append(f"Policy validation failure requires override actions (-{8 * policy_violations})")
        
    # 8. Rejection state (-5)
    if rejection_state:
        score -= 5
        applied_rules.append("Claim undergoes a full rejection state due to rule non-compliance (-5)")
        
    # 9. Dispute resolution favor (+5)
    if dispute_resolved_favorably:
        score += 5
        applied_rules.append("Reviewer rules in favor of user during a formal dispute resolution (+5)")
        
    # 10. Compliant claim approved without exceptions (+2)
    # Applied if no negative score adjustments occurred
    has_negative_adjustments = (
        tampering_detected or 
        (recon_status == "MISMATCH" or mismatch_amount > 0) or 
        is_duplicate or 
        anomaly_major_variance or 
        anomaly_watch_level or 
        outside_business_hours or 
        policy_violations > 0 or 
        rejection_state
    )
    if not has_negative_adjustments:
        score += 2
        applied_rules.append("Compliant claim approved without exceptions (+2)")

    # Bounded strictly between 0 and 100
    adjusted_score = max(0, min(100, score))
    
    # Determine Routing Lane
    if adjusted_score >= 85:
        route = "FAST_TRACK"
    elif adjusted_score >= 60:
        route = "MANAGER_REVIEW"
    else:
        route = "ESCALATED"

    # Override: direct tampering escalates immediately
    if tampering_detected:
        route = "ESCALATED"

    logger.info(f"Trust Calculation: {current_score} -> {adjusted_score}. Route: {route}. Rules: {applied_rules}")
    return adjusted_score, route, applied_rules
