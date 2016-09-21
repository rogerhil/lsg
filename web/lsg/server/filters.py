from django_filters.filters import BaseInFilter


class BaseNotInFilter(BaseInFilter):

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('lookup_expr', 'in')
        kwargs['exclude'] = True
        super(BaseInFilter, self).__init__(*args, **kwargs)