from datetime import datetime

import geocoder
from actstream.models import actor_stream

from django.db.models import Prefetch
from django.conf import settings
from django.utils import formats
from django.core.urlresolvers import resolve

from rest_framework import viewsets, views, status
from rest_framework.decorators import detail_route
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from utils import short_timesince
from users.api.serializers import CollectionItemSerializer, UserSerializer, \
    WishlistItemSerializer, UserPictureImageSerializer, SmallUserSerializer, \
    UserCountsStarsSerializer
from users.api.permissions import IsSuperUserOrOwner
from users.models import User, CollectionItem, WishlistItem, UserReport
from users.exceptions import CollectionGameDeleteException
from users.activities import Verbs
from mail.sender import Sender
from cache import CachedViewSetMixin


class AuthenticatedUserView(views.APIView):
    serializer_class = UserSerializer

    def get(self, request, format=None):
        serializer = self.serializer_class()
        if request.user.is_authenticated():
            if request.user.app_updates:
                # browser refreshed!
                request.user.app_updates = False
                request.user.save()
                serialized = serializer.to_representation(request.user)
                serialized['app_updated'] = True
            else:
                serialized = serializer.to_representation(request.user)
            return views.Response(serialized)
        else:
            return views.Response("User not authenticated.", status=HTTP_400_BAD_REQUEST)


class UsersViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter().select_related('address')\
        .prefetch_related('social_auth')
    serializer_class = UserSerializer
    permission_classes = [IsSuperUserOrOwner]

    def check_permissions(self, request):
        """ Don't apply the same IsSuperUserOrOwner permission to the
        latest_feedbacks view.
        """
        try:
            super(UsersViewSet, self).check_permissions(request)
        except PermissionDenied as err:
            url_name = resolve(request.path).url_name
            if url_name == 'user-latest-feedbacks':
                return
            raise err

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        resp = Response("You still have unfinished open requests, so you "
                        "need to close them before you delete your account.",
                        status=status.HTTP_403_FORBIDDEN)
        for item in CollectionItem.objects.filter(user=user):
            if item.is_in_open_request():
                return resp
        for item in WishlistItem.objects.filter(user=user):
            if item.is_in_open_request():
                return resp
        user.deleted = True
        user.deleted_date = datetime.now()
        user.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @detail_route(methods=['get'], serializer_class=UserCountsStarsSerializer,
                  url_path='counts-stars')
    def counts_stars(self, request, pk):
        serializer = UserCountsStarsSerializer()
        return views.Response(serializer.to_representation(request.user))

    @detail_route(methods=['get'], url_path='query-address')
    def query_address(self, request, pk):
        code = request.user.address.country.code
        geo = geocoder.google(request.GET.get('search', ''),
                              components="country:%s" % code,
                              timeout=30, key=settings.GOOGLE_GEOCODING_KEY, language='en')
        address = geo.address
        if code == 'IE' and address:
            # GOOGLE BUG!!!
            address = address.replace(', Co. ', ', ')
        return views.Response([dict(display=address)])

    @detail_route(methods=['get'])
    def matches(self, request, pk):
        return views.Response(request.user.serialized_matches)

    @detail_route(methods=['get'], url_path='recent-feedback')
    def recent_feedback(self, request, pk, permission_classes=[]):
        serialized = []
        serializer = SmallUserSerializer()
        recent = User.user_recent_feedback(pk)
        for feedback in recent['items']:
            feedback['user'] = serializer.to_representation(feedback['user'])
            feedback['closed_at'] = formats.date_format(feedback['closed_at'],
                                                        "SHORT_DATETIME_FORMAT")
            feedback['closed_at_since'] = feedback['closed_at_since']
            serialized.append(feedback)
        recent['items'] = serialized
        return views.Response(recent)

    @detail_route(methods=['get'], url_path='recent-activities')
    def recent_activities(self, request, pk):
        items = actor_stream(request.user)
        serialized = []
        user = request.user
        for item in items[:10]:
            verb = Verbs.get(item)
            serialized.append(dict(
                id=item.id,
                description=verb.parse(item, user, True),
                since=short_timesince(item.timestamp),
                verb=item.verb,
                css_class=verb.css_class,
                color=verb.color
            ))
        Verbs.clear_cache()
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

    @detail_route(methods=['post'], url_path='report-user')
    def report_user(self, request, pk):
        user = self.queryset.get(pk=pk)
        reported_id = int(request.data['reported_id'])
        message = request.data['message']
        user_report = UserReport.objects.create(reporter=user, reported_id=reported_id,
                                                message=message)
        user_report.reported.reported = True
        user_report.reported.save()
        context = dict(user_report=user_report)
        emails = [i[-1] for i in settings.ADMINS]
        sender = Sender("User reported in Let'SwapGames!!!", 'admin_user_reported', context,
                        emails)
        sender.send()
        return views.Response({'message': 'User successfully reported!'})


class CollectionItemViewSet(CachedViewSetMixin, viewsets.ModelViewSet):
    queryset = CollectionItem.objects.all().order_by('game__name')
    serializer_class = CollectionItemSerializer
    permission_classes = [IsSuperUserOrOwner]
    cache_kwargs_key = 'user_pk'
    cache_obj_keys = ['user_id']

    def get_queryset(self):
        user_id = self.kwargs.get('user_pk')
        queryset = self.queryset.filter(user_id=user_id)
        platform_id = self.request.GET.get('p')
        if platform_id:
            queryset = queryset.filter(game__platform_id=platform_id)
        return queryset.select_related('game').select_related('game__platform')

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


class WishlistViewSet(CachedViewSetMixin, viewsets.ModelViewSet):
    queryset = WishlistItem.objects.all().order_by('game__name')
    serializer_class = WishlistItemSerializer
    permission_classes = [IsSuperUserOrOwner]
    cache_kwargs_key = 'user_pk'
    cache_obj_keys = ['user_id']

    def get_queryset(self):
        user_id = self.kwargs.get('user_pk')
        queryset = self.queryset.filter(user_id=user_id)
        platform_id = self.request.GET.get('p')
        if platform_id:
            queryset = queryset.filter(game__platform_id=platform_id)
        return queryset.select_related('game').select_related('game__platform')

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
