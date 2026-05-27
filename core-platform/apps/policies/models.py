from django.db import models

class ExpensePolicy(models.Model):
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    max_amount_limit = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} - {self.category}: Limit {self.max_amount_limit}"
