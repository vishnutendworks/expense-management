from django.urls import path
from django.views.generic import TemplateView

urlpatterns = [
    path('', TemplateView.as_view(template_name='claim_submit.html'), name='ui_claim_submit'),
]
