from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import ExpenseClaim
from .serializers import ExpenseClaimSerializer
from haystack.query import SearchQuerySet
import logging
import csv
from datetime import timedelta
from django.utils import timezone
from django.http import HttpResponse

logger = logging.getLogger(__name__)

class ExpenseClaimSubmitView(generics.CreateAPIView):
    """
    Endpoint for submitting an expense claim with nested line items and uploaded files.
    Accepts multipart/form-data.
    """
    serializer_class = ExpenseClaimSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def perform_create(self, serializer):
        # Pass employee as the current authenticated user
        serializer.save(employee=self.request.user)

class ExpenseClaimListView(generics.ListCreateAPIView):
    """
    List all submitted claims, or submit a new claim.
    Regular employees see only their own claims.
    Managers/Staff see all claims.
    """
    serializer_class = ExpenseClaimSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return ExpenseClaim.objects.all().order_by('-created_at')
        return ExpenseClaim.objects.filter(employee=user).order_by('-created_at')

    def perform_create(self, serializer):
        # Pass employee as the current authenticated user
        serializer.save(employee=self.request.user)

class ExpenseClaimDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific claim.
    """
    serializer_class = ExpenseClaimSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return ExpenseClaim.objects.all()
        return ExpenseClaim.objects.filter(employee=user)

class ExpenseClaimSearchView(APIView):
    """
    Search endpoint using django-haystack (Whoosh backend).
    Falls back to direct database query if search backend fails.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        query = request.query_params.get('q', '')
        if not query:
            return Response([])

        try:
            # Query the Haystack search index
            search_results = SearchQuerySet().filter(content=query)
            # Filter matches for the ExpenseClaim model
            claim_ids = [result.pk for result in search_results if result.model_name == 'expenseclaim']
            
            queryset = ExpenseClaim.objects.filter(id__in=claim_ids)
            if not request.user.is_staff:
                queryset = queryset.filter(employee=request.user)
                
            serializer = ExpenseClaimSerializer(queryset, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            logger.warning(f"Haystack search failed: {e}. Falling back to database query.")
            
            # Database query fallback (searches title and merchant/category of line items)
            queryset = ExpenseClaim.objects.filter(
                title__icontains=query
            )
            if not request.user.is_staff:
                queryset = queryset.filter(employee=request.user)
                
            serializer = ExpenseClaimSerializer(queryset.distinct(), many=True, context={'request': request})
            return Response(serializer.data)

class FinanceCSVExportView(APIView):
    """
    Export all claims with status APPROVED or FAST_TRACK to a downloadable CSV.
    Only accessible by authenticated staff/admin users.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request, *args, **kwargs):
        # Create the HttpResponse object with the appropriate CSV header.
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="approved_claims_export.csv"'

        writer = csv.writer(response)
        # Write headers
        writer.writerow([
            'Claim ID', 'Employee ID', 'Employee Username', 'Title', 
            'Total Amount', 'Status', 'Adjusted Trust Score', 
            'Recommended Route', 'Created At'
        ])

        # Query claims matching the status
        claims = ExpenseClaim.objects.filter(
            status__in=['APPROVED', 'FAST_TRACK']
        ).order_by('-created_at')

        # Write data rows
        for claim in claims:
            writer.writerow([
                claim.id,
                claim.employee.employee_id or claim.employee.id,
                claim.employee.username,
                claim.title,
                claim.total_amount,
                claim.status,
                claim.adjusted_trust_score if claim.adjusted_trust_score is not None else '',
                claim.recommended_route or '',
                claim.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])

        return response

class ExpenseHistoryView(APIView):
    """
    Get a user's last 30 days of approved claims (APPROVED or FAST_TRACK).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, employee_id, *args, **kwargs):
        # Allow employees to view their own history, or staff users to view anyone's history
        if not request.user.is_staff and request.user.id != int(employee_id):
            return Response(
                {"detail": "You do not have permission to view this user's history."},
                status=status.HTTP_403_FORBIDDEN
            )

        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        claims = ExpenseClaim.objects.filter(
            employee_id=employee_id,
            status__in=['APPROVED', 'FAST_TRACK'],
            created_at__gte=thirty_days_ago
        ).order_by('-created_at')

        serializer = ExpenseClaimSerializer(claims, many=True, context={'request': request})
        return Response(serializer.data)

