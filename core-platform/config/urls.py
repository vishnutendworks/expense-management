from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from django.conf import settings
from django.conf.urls.static import static
from expenses.views import FinanceCSVExportView, ExpenseHistoryView

# Swagger documentation setup
schema_view = get_schema_view(
    openapi.Info(
        title="Expense Processing Platform API",
        default_version='v1',
        description="API documentation for the Expense Submission, OCR Validation, and Intelligence Routing system.",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="support@example.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/v1/swagger<format>/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('api/v1/swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/v1/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # Authentication & Users
    path('api/v1/auth/', include('users.urls')),
    path('microsoft/', include('microsoft_auth.urls', namespace='microsoft_auth')),
    
    # Expenses App APIs & UI Pages
    path('api/v1/expenses/', include('expenses.urls')),
    
    # Direct history endpoint for exact example url in PRD
    path('api/expenses/history/<int:employee_id>/', ExpenseHistoryView.as_view(), name='expense_claim_history_direct'),
    
    # Finance APIs
    path('api/v1/finance/export/', FinanceCSVExportView.as_view(), name='finance_csv_export'),
    
    # Optional Server-rendered UI Pages
    path('', include('expenses.ui_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
