from django.urls import path
from .views import (
    ExpenseClaimSubmitView,
    ExpenseClaimListView,
    ExpenseClaimDetailView,
    ExpenseClaimSearchView
)

urlpatterns = [
    path('', ExpenseClaimListView.as_view(), name='expense_claim_list'),
    path('submit/', ExpenseClaimSubmitView.as_view(), name='expense_claim_submit'),
    path('search/', ExpenseClaimSearchView.as_view(), name='expense_claim_search'),
    path('<int:pk>/', ExpenseClaimDetailView.as_view(), name='expense_claim_detail'),
]
