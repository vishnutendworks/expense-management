from django.db import models
from django.conf import settings

class ExpenseClaim(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted - Pending Routing'),
        ('UNDER_REVIEW', 'Under Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('FAST_TRACK', 'Fast-Track Queue'),
        ('MANAGER_REVIEW', 'Manager Review'),
        ('ESCALATED', 'Finance Escalation'),
        ('PAID', 'Paid'),
    ]

    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    adjusted_trust_score = models.IntegerField(null=True, blank=True)
    recommended_route = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.employee}"

class ExpenseLineItem(models.Model):
    claim = models.ForeignKey(ExpenseClaim, related_name='line_items', on_delete=models.CASCADE)
    expense_date = models.DateField()
    merchant_name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency_code = models.CharField(max_length=3, default='INR')
    payment_mode = models.CharField(max_length=50)
    project_cost_centre = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    receipt_file = models.FileField(upload_to='receipts/', null=True, blank=True)

    # Core AI evaluation metadata populated by Engineer 2 and 3 pipelines
    ocr_confidence = models.FloatField(null=True, blank=True)
    bank_reconciled = models.BooleanField(default=False)
    anomaly_status = models.CharField(max_length=20, default='NORMAL')

    def __str__(self):
        return f"{self.merchant_name} - {self.amount} {self.currency_code}"
