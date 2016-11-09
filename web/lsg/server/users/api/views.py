import geocoder
from actstream.models import actor_stream

from django.conf import settings
from django.utils import formats

from rest_framework import viewsets, views
from rest_framework.decorators import detail_route
from rest_framework.status import HTTP_400_BAD_REQUEST

from utils import short_timesince
from users.api.serializers import CollectionItemSerializer, UserSerializer, \
    WishlistItemSerializer, UserPictureImageSerializer
from users.api.permissions import IsSuperUserOrOwner
from users.models import User, CollectionItem, WishlistItem
from users.exceptions import CollectionGameDeleteException
from users.activities import Verbs


class AuthenticatedUserView(views.APIView):
    serializer_class = UserSerializer

    def get(self, request, format=None):
        serializer = self.serializer_class()
        if request.user.is_authenticated():
            serialized = serializer.to_representation(request.user)
            return views.Response(serialized)
        else:
            return views.Response("User not authenticated.", status=HTTP_400_BAD_REQUEST)


class UsersViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsSuperUserOrOwner]

    @detail_route(methods=['get'], url_path='query-address')
    def query_address(self, request, pk):
        code = request.user.address.country.code
        geo = geocoder.google(request.GET.get('search', ''), components="country:%s" % code,
                              timeout=30, key=settings.GOOGLE_GEOCODING_KEY)
        return views.Response([dict(display=geo.address)])

    @detail_route(methods=['get'])
    def matches(self, request, pk):
        return views.Response(request.user.serialized_matches)

    @detail_route(methods=['get'], url_path='latest-feedbacks')
    def latest_feedbacks(self, request, pk):
        serialized = []
        serializer = UserSerializer()
        user = User.objects.get(pk=pk)
        for feedback in user.last_feedbacks():
            feedback['user'] = serializer.to_representation(feedback['user'])
            feedback['closed_at'] = formats.date_format(feedback['closed_at'],
                                                       "SHORT_DATETIME_FORMAT")
            serialized.append(feedback)
        return views.Response(serialized)

    @detail_route(methods=['get'], url_path='latest-activities')
    def latest_activities(self, request, pk):
        items = actor_stream(request.user)
        serialized = []
        for item in items[:8]:
            verb = Verbs.get(item)
            serialized.append(dict(
                description=verb.parse(item, request.user),
                since=short_timesince(item.timestamp),
                verb=item.verb,
                css_class=verb.css_class,
                color=verb.color
            ))
        return views.Response(serialized)

    @detail_route(methods=['put'], serializer_class=UserPictureImageSerializer)
    def picture(self, request, pk):
        user = self.queryset.get(pk=pk)
        serializer = UserPictureImageSerializer(data=request.data,
                                                instance=user)
        if not serializer.is_valid():
            return views.Response(serializer.errors,
                                  status=HTTP_400_BAD_REQUEST)
        user = serializer.save()
        Verbs.changed_profile_picture.send(user)
        user_serializer = UserSerializer()
        return views.Response(user_serializer.to_representation(user))


class CollectionItemViewSet(viewsets.ModelViewSet):
    queryset = CollectionItem.objects.all().order_by('game__name')
    serializer_class = CollectionItemSerializer
    permission_classes = [IsSuperUserOrOwner]

    def get_queryset(self):
        user_id = self.kwargs.get('user_pk')
        return self.queryset.filter(user_id=user_id)\
                            .select_related('game')\
                            .select_related('game__platform')

    def perform_destroy(self, instance):
        super(CollectionItemViewSet, self).perform_destroy(instance)
        Verbs.removed_from_collection.send(instance.user, instance.game)

    def destroy(self, request, *args, **kwargs):
        try:
            return super(CollectionItemViewSet, self).destroy(request, *args,
                                                              **kwargs)
        except CollectionGameDeleteException as err:
            errors = dict(request_open=str(err))
            return views.Response(errors, status=HTTP_400_BAD_REQUEST)


class WishlistViewSet(viewsets.ModelViewSet):
    queryset = WishlistItem.objects.all().order_by('game__name')
    serializer_class = WishlistItemSerializer
    permission_classes = [IsSuperUserOrOwner]

    def get_queryset(self):
        user_id = self.kwargs.get('user_pk')
        return self.queryset.filter(user_id=user_id)\
                            .select_related('game')\
                            .select_related('game__platform')

    def perform_destroy(self, instance):
        super(WishlistViewSet, self).perform_destroy(instance)
        Verbs.removed_from_wishlist.send(instance.user, instance.game)

    def destroy(self, request, *args, **kwargs):
        try:
            return super(WishlistViewSet, self).destroy(request, *args,
                                                        **kwargs)
        except CollectionGameDeleteException as err:
            errors = dict(request_open=str(err))
            return views.Response(errors, status=HTTP_400_BAD_REQUEST)
