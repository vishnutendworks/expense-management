import json
import logging
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import ExpenseClaim, ExpenseLineItem
from .services import parse_receipt_ocr, evaluate_claim_trust
from django.utils import timezone

User = get_user_model()
logger = logging.getLogger(__name__)

class ExpenseLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseLineItem
        fields = (
            'id', 'expense_date', 'merchant_name', 'category', 'amount',
            'currency_code', 'payment_mode', 'project_cost_centre',
            'description', 'receipt_file', 'ocr_confidence', 'bank_reconciled',
            'anomaly_status'
        )
        read_only_fields = ('ocr_confidence', 'bank_reconciled', 'anomaly_status')

class ExpenseClaimSerializer(serializers.ModelSerializer):
    line_items = ExpenseLineItemSerializer(many=True, required=False)
    employee_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ExpenseClaim
        fields = ('id', 'employee', 'employee_details', 'title', 'total_amount', 'status', 'created_at', 'line_items')
        read_only_fields = ('employee', 'total_amount', 'status')

    def get_employee_details(self, obj):
        return {
            "id": obj.employee.id,
            "username": obj.employee.username,
            "trust_score": obj.employee.trust_score,
            "employee_id": obj.employee.employee_id
        }

    def to_internal_value(self, data):
        # Support stringified JSON payload in Multipart Form-Data
        if 'payload' in data:
            try:
                payload_str = data['payload']
                if isinstance(payload_str, list):
                    payload_str = payload_str[0]
                parsed = json.loads(payload_str)
                
                # Standardize keys: claim_title -> title
                if 'claim_title' in parsed:
                    parsed['title'] = parsed.pop('claim_title')
                data = parsed
            except Exception as e:
                raise serializers.ValidationError({"payload": f"Invalid JSON string in payload: {str(e)}"})
        
        # Ensure mapping of claim_title
        if 'claim_title' in data and 'title' not in data:
            data['title'] = data['claim_title']
            
        return super().to_internal_value(data)

    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items', [])
        request = self.context.get('request')
        user = request.user if request else validated_data.get('employee')
        
        if not user:
            raise serializers.ValidationError("An authenticated user is required to submit a claim.")
            
        # 1. Create the ExpenseClaim shell
        claim = ExpenseClaim.objects.create(
            employee=user,
            title=validated_data.get('title'),
            total_amount=0.00,
            status='DRAFT' # Default to draft until evaluated
        )

        files = request.FILES if request else {}
        total_amount = 0
        ocr_confidences = []
        any_tampering = False
        
        # 2. Iterate line items, process files, run OCR
        for i, item_data in enumerate(line_items_data):
            # Check for file matching by receipt_i, receipts list, or receipt_file list
            receipt_file = files.get(f'receipt_{i}')
            if not receipt_file:
                receipts_list = files.getlist('receipts')
                if i < len(receipts_list):
                    receipt_file = receipts_list[i]
            if not receipt_file:
                receipt_file_list = files.getlist('receipt_file')
                if i < len(receipt_file_list):
                    receipt_file = receipt_file_list[i]
            
            # Instantiate line item defaults
            ocr_conf = None
            tampering_detected = False
            
            # Trigger OCR if file is uploaded
            if receipt_file:
                ocr_result = parse_receipt_ocr(receipt_file)
                if ocr_result and ocr_result.get('status') == 'success':
                    extracted = ocr_result.get('extracted_data', {})
                    ocr_conf = extracted.get('ocr_confidence', 0.85)
                    tampering_detected = extracted.get('tampering_detected', False)
                    
                    # Auto-populate details if blank
                    if not item_data.get('merchant_name') or item_data.get('merchant_name') == '':
                        item_data['merchant_name'] = extracted.get('merchant_name', 'Unknown Merchant')
                    if not item_data.get('expense_date'):
                        item_data['expense_date'] = extracted.get('expense_date', timezone.now().date())
                    if not item_data.get('amount'):
                        item_data['amount'] = extracted.get('total_amount', 0.00)
            
            # Set default values for AI details
            ocr_confidences.append(ocr_conf if ocr_conf is not None else 1.0)
            if tampering_detected:
                any_tampering = True
                
            line_item = ExpenseLineItem.objects.create(
                claim=claim,
                expense_date=item_data.get('expense_date', timezone.now().date()),
                merchant_name=item_data.get('merchant_name', 'Unknown'),
                category=item_data.get('category', 'Other'),
                amount=item_data.get('amount', 0.00),
                currency_code=item_data.get('currency_code', 'INR'),
                payment_mode=item_data.get('payment_mode', 'cash'),
                project_cost_centre=item_data.get('project_cost_centre', 'General'),
                description=item_data.get('description', ''),
                receipt_file=receipt_file,
                ocr_confidence=ocr_conf,
                anomaly_status='TAMPERED' if tampering_detected else 'NORMAL'
            )
            
            total_amount += line_item.amount

        # Update total amount of the claim
        claim.total_amount = total_amount
        claim.save()
        
        # 3. Assemble trust evaluation payload
        avg_ocr_confidence = sum(ocr_confidences) / len(ocr_confidences) if ocr_confidences else 1.0
        
        # Check standard office hours (9 AM - 6 PM in user's timezone context, fallback to UTC hour check)
        now = timezone.now()
        outside_hours = now.hour < 9 or now.hour >= 18
        
        # Check simple policy violations: e.g., single line item > 50000 INR
        policy_violations = 0
        for item in claim.line_items.all():
            if item.amount > 50000:
                policy_violations += 1

        eval_payload = {
            "employee_id": user.employee_id or user.id,
            "current_trust_score": user.trust_score,
            "claim_id": claim.id,
            "ocr_results": {
                "ocr_confidence": round(avg_ocr_confidence, 2),
                "tampering_detected": any_tampering
            },
            "recon_results": {
                "status": "VERIFIED" if not any_tampering else "MISMATCH",
                "mismatch_amount": 0.00
            },
            "policy_violations_count": policy_violations,
            "outside_business_hours": outside_hours
        }

        # 4. Call Trust Engine Sidecar
        eval_result = evaluate_claim_trust(eval_payload)
        
        # 5. Apply Trust Engine results back to monolith state
        claim.status = eval_result.get('recommended_route', 'MANAGER_REVIEW')
        claim.adjusted_trust_score = eval_result.get('adjusted_trust_score', user.trust_score)
        claim.recommended_route = eval_result.get('recommended_route', 'MANAGER_REVIEW')
        claim.save()
        
        # Update user's trust score
        new_trust_score = eval_result.get('adjusted_trust_score', user.trust_score)
        user.trust_score = new_trust_score
        user.save()
        
        # Update line item anomalies status based on overall evaluation or metadata
        if eval_result.get('anomaly_status') == 'WARNING':
            claim.line_items.filter(anomaly_status='NORMAL').update(anomaly_status='WARNING')

        return claim
