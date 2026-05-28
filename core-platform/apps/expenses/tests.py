from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from .models import ExpenseClaim, ExpenseLineItem
from django.core.files.uploadedfile import SimpleUploadedFile
import json

User = get_user_model()

class ExpensePlatformTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='employee1042',
            password='password123',
            trust_score=85,
            employee_id=1042
        )
        self.client.force_authenticate(user=self.user)

    def test_models_creation(self):
        claim = ExpenseClaim.objects.create(
            employee=self.user,
            title="Business Trip",
            total_amount=1500.00,
            status="SUBMITTED"
        )
        line = ExpenseLineItem.objects.create(
            claim=claim,
            expense_date="2026-05-21",
            merchant_name="Hotel Hilton",
            category="Lodging",
            amount=1500.00,
            currency_code="INR",
            payment_mode="corporate_card",
            project_cost_centre="Sales-APAC",
            description="Hotel stay for client meetings"
        )
        self.assertEqual(ExpenseClaim.objects.count(), 1)
        self.assertEqual(ExpenseLineItem.objects.count(), 1)
        self.assertEqual(line.claim, claim)
        self.assertEqual(claim.total_amount, 1500.00)

    @patch('expenses.serializers.parse_receipt_ocr')
    @patch('expenses.serializers.evaluate_claim_trust')
    def test_claim_submission_api(self, mock_evaluate_trust, mock_parse_ocr):
        # Setup mocks
        mock_parse_ocr.return_value = {
            "status": "success",
            "extracted_data": {
                "merchant_name": "Ola Cabs",
                "expense_date": "2026-05-21",
                "total_amount": 460.00,
                "tax_amount": 21.90,
                "currency_code": "INR",
                "ocr_confidence": 0.94,
                "tampering_detected": False
            }
        }
        
        mock_evaluate_trust.return_value = {
            "claim_id": 1,
            "adjusted_trust_score": 88,
            "recommended_route": "FAST_TRACK",
            "anomaly_status": "NORMAL",
            "violations": []
        }

        # Submit data payload
        payload = {
            "claim_title": "Chennai Client Trip - May",
            "status": "SUBMITTED",
            "line_items": [
                {
                    "expense_date": "2026-05-21",
                    "merchant_name": "Ola Cabs",
                    "category": "Local Travel",
                    "amount": 460.00,
                    "currency_code": "INR",
                    "payment_mode": "cash",
                    "project_cost_centre": "Sales-APAC",
                    "description": "Ola Cabs ride to client office"
                }
            ]
        }

        # Create dummy receipt file
        receipt_file = SimpleUploadedFile(
            "receipt.jpg",
            b"fake_image_binary_data",
            content_type="image/jpeg"
        )

        data = {
            'payload': json.dumps(payload),
            'receipt_0': receipt_file
        }

        url = reverse('expense_claim_submit')
        response = self.client.post(url, data, format='multipart')

        # Check API status
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check models created
        self.assertEqual(ExpenseClaim.objects.count(), 1)
        self.assertEqual(ExpenseLineItem.objects.count(), 1)
        
        claim = ExpenseClaim.objects.first()
        self.assertEqual(claim.title, "Chennai Client Trip - May")
        self.assertEqual(claim.status, "FAST_TRACK")
        self.assertEqual(claim.total_amount, 460.00)
        self.assertEqual(claim.adjusted_trust_score, 88)
        self.assertEqual(claim.recommended_route, "FAST_TRACK")
        
        # Check user trust score updated
        self.user.refresh_from_db()
        self.assertEqual(self.user.trust_score, 88)
        
        # Verify mock sidecar invocation details
        mock_parse_ocr.assert_called_once()
        mock_evaluate_trust.assert_called_once()

    def test_search_view_fallback(self):
        # Create a search match
        ExpenseClaim.objects.create(
            employee=self.user,
            title="Chennai Client Trip",
            total_amount=500.00,
            status="SUBMITTED"
        )
        url = reverse('expense_claim_search')
        response = self.client.get(url, {'q': 'Chennai'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Chennai Client Trip")

    def test_finance_csv_export_access(self):
        # Authenticated as regular employee (self.user is not staff)
        url = reverse('finance_csv_export')
        response = self.client.get(url)
        # Should be forbidden for non-staff
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Unauthenticated user
        self.client.force_authenticate(user=None)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_finance_csv_export_data(self):
        # Create staff user
        staff_user = User.objects.create_user(
            username='staffadmin',
            password='password123',
            is_staff=True
        )
        self.client.force_authenticate(user=staff_user)

        # Create claims with various statuses
        ExpenseClaim.objects.create(
            employee=self.user,
            title="Approved Claim",
            total_amount=250.00,
            status="APPROVED",
            adjusted_trust_score=90,
            recommended_route="APPROVED"
        )
        ExpenseClaim.objects.create(
            employee=self.user,
            title="Fast Track Claim",
            total_amount=150.00,
            status="FAST_TRACK",
            adjusted_trust_score=95,
            recommended_route="FAST_TRACK"
        )
        ExpenseClaim.objects.create(
            employee=self.user,
            title="Draft Claim",
            total_amount=500.00,
            status="DRAFT"
        )

        url = reverse('finance_csv_export')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('attachment', response['Content-Disposition'])

        # Decode CSV content and check lines
        content = response.content.decode('utf-8')
        lines = content.strip().split('\r\n')
        
        # Header + 2 claims (Approved & Fast Track) = 3 lines total
        self.assertEqual(len(lines), 3)
        self.assertIn('Approved Claim', content)
        self.assertIn('Fast Track Claim', content)
        self.assertNotIn('Draft Claim', content)
