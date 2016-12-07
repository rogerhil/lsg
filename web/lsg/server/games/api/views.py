from django.conf import settings

from django_filters.filters import CharFilter, BaseInFilter
from django_filters import FilterSet

from rest_framework import response, viewsets, mixins
from rest_framework.filters import SearchFilter, OrderingFilter, \
                                   DjangoFilterBackend
from rest_framework.decorators import list_route
from rest_framework.permissions import IsAuthenticated

from filters import BaseNotInFilter
from games.models import Game, Platform
from games.api.serializers import PlatformSerializer, GameSerializer, \
    CategorizedGameSerializer

#all_platforms = Platform.objects.all()
#platforms_names = [i.name.lower() for i in all_platforms]


class PlatformViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = PlatformSerializer
    queryset = Platform.objects.filter(name__in=settings.SUPPORTED_PLATFORMS).order_by('name')
    filter_backends = (SearchFilter, OrderingFilter)
    search_fields = ('name',)
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super(PlatformViewSet, self).get_queryset()
        #platforms = sorted(queryset, key=lambda x: x.short_name)
        return queryset


class GameFilter(FilterSet):
    platform = CharFilter(name="platform__name", lookup_expr="icontains")
    platform_id = BaseInFilter(name="platform_id")
    exclude_games = BaseNotInFilter(name="id")

    class Meta:
        model = Game
        fields = ['platform', 'platform_id', 'exclude_games']


class GameViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Game.objects.all().select_related('platform')
    serializer_class = GameSerializer
    filter_backends = (SearchFilter, OrderingFilter, DjangoFilterBackend)
    search_fields = ('@fts', 'name', 'platform__name')
    filter_class = GameFilter
    permission_classes = [IsAuthenticated]

    @list_route(methods=['get'])
    def categorized(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        context = self.get_serializer_context()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = CategorizedGameSerializer(page, many=True,
                                                   context=context)
            return self.get_paginated_response(serializer.data)
        serializer = CategorizedGameSerializer(queryset, many=True,
                                               context=context)
        return response.Response(serializer.data)
