from django.conf import settings

from django_filters.filters import CharFilter, BaseInFilter
from django_filters import FilterSet

from rest_framework import views, viewsets, mixins
from rest_framework.filters import SearchFilter, OrderingFilter, \
                                   DjangoFilterBackend
from rest_framework.decorators import list_route, detail_route
from rest_framework.permissions import IsAuthenticated

from filters import BaseNotInFilter
from games.models import Game, Platform
from games.api.serializers import PlatformSerializer, GameSerializer, FullGameSerializer, \
    CategorizedGameSerializer
from users.models import CollectionItem, WishlistItem

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
        # change order only for: Super Nintendo
        platforms = []
        snes = None
        last_nintendo = 0
        for i, p in enumerate(queryset):
            name = p.short_name .lower().strip()
            if name.startswith('nintendo'):
                last_nintendo = i
            if name == 'snes':
                snes = p
                continue
            platforms.append(p)
        platforms.insert(last_nintendo + 1, snes)
        return platforms


class GameFilter(FilterSet):
    platform = CharFilter(name="platform__name", lookup_expr="icontains")
    platform_id = BaseInFilter(name="platform_id")
    exclude_games = BaseNotInFilter(name="id")

    class Meta:
        model = Game
        fields = ['platform', 'platform_id', 'exclude_games']


class GameOrderingFilter(OrderingFilter):

    def filter_queryset(self, request, queryset, view):
        queryset = super(GameOrderingFilter, self).filter_queryset(request, queryset, view)
        params = request.query_params.get(self.ordering_param)
        if params and '-release' in params:
            queryset = queryset.extra(select={'date_is_null': 'release IS NULL'},
                                      order_by=['date_is_null', '-release', 'id'])
        return queryset


class GameViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Game.objects.all().select_related('platform')
    serializer_class = GameSerializer
    filter_backends = (SearchFilter, GameOrderingFilter, DjangoFilterBackend)
    search_fields = ('@fts', 'name', 'platform__name')
    filter_class = GameFilter
    permission_classes = [IsAuthenticated]

    @list_route(methods=['get'], serializer_class=FullGameSerializer)
    def detailed(self, request):
        return super(GameViewSet, self).list(request)

    @detail_route(methods=['get'], url_path='owned-by')
    def owned_by(self, request, pk):
        from users.api.serializers import MapUserSerializer
        users = []
        serializer = MapUserSerializer()
        for collection_item in CollectionItem.objects.filter(game__id=pk):
            users.append(serializer.to_representation(collection_item.user))
        return views.Response(users)

    @detail_route(methods=['get'], url_path='wanted-by')
    def wanted_by(self, request, pk):
        from users.api.serializers import MapUserSerializer
        users = []
        serializer = MapUserSerializer()
        for wishlist_item in WishlistItem.objects.filter(game__id=pk):
            users.append(serializer.to_representation(wishlist_item.user))
        return views.Response(users)
