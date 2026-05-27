from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    trust_score = models.IntegerField(default=85, help_text="Dynamic trust score bounded strictly between 0 and 100")
    employee_id = models.IntegerField(unique=True, null=True, blank=True, help_text="Corporate employee reference ID")

    def __str__(self):
        return f"{self.username} (ID: {self.employee_id or self.id})"
