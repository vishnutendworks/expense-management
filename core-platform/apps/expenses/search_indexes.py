from haystack import indexes
from .models import ExpenseClaim

class ExpenseClaimIndex(indexes.SearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    employee = indexes.CharField(model_attr='employee__username')
    title = indexes.CharField(model_attr='title')
    status = indexes.CharField(model_attr='status')
    created_at = indexes.DateTimeField(model_attr='created_at')

    def get_model(self):
        return ExpenseClaim

    def index_queryset(self, using=None):
        """Used when the entire index for model is updated."""
        return self.get_model().objects.all()
