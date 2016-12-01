from datetime import timedelta

from django.db.models import Q
from django_filters.filters import BaseInFilter
from django.conf import settings

from rest_framework_cache.cache import cache
from rest_framework.decorators import detail_route, list_route
from rest_framework import viewsets, views, mixins
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.filters import OrderingFilter, FilterSet, \
    DjangoFilterBackend

from mail.sender import MailBuilder
from mail.models import EmailSchedule
from users.api.permissions import IsSuperUserOrOwner
from users.models import User
from users.activities import Verbs
from request.flow import Status
from request.models import SwapRequest
from request.api.serializers import SwapRequestSerializer, \
    AcceptRequestSerializer, RefuseRequestSerializer, \
    CancelRequestSerializer, FinalizeFirstRequestSerializer, \
    FinalizeSecondRequestSerializer, ArchiveRequestSerializer, \
    ArchivedSwapRequestSerializer
from cache import CachedViewSetMixin, get_cache_key_for_viewset


class MyRequestsViewSet(CachedViewSetMixin, mixins.CreateModelMixin, mixins.ListModelMixin,
                        mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = SwapRequest.objects.all().exclude(requester_archived=True)
    serializer_class = SwapRequestSerializer
    permission_classes = [IsSuperUserOrOwner]
    cache_kwargs_key = 'user_pk'
    cache_obj_keys = ['requester_id', 'requested_id']

    def get_queryset(self):
        user_id = self.kwargs.get('user_pk')
        return self.queryset.filter(requester_id=user_id)\
            .select_related('requester').select_related('requested')

    def perform_create(self, serializer):
        super(MyRequestsViewSet, self).perform_create(serializer)
        swap_request = serializer.instance
        sender = MailBuilder.swap_requested(swap_request)
        sender.send()

    @detail_route(methods=['post'],
                  serializer_class=CancelRequestSerializer)
    def cancel(self, request, user_pk, pk):
        swap_request = SwapRequest.objects.get(pk=pk)
        if swap_request.requester.id != int(user_pk):
            msg = "Only who requests can cancel a Swap Request"
            return views.Response(msg, status=HTTP_400_BAD_REQUEST)
        serializer = CancelRequestSerializer(data=request.data,
                                             instance=swap_request)
        if not serializer.is_valid():
            return views.Response(serializer.errors,
                                  status=HTTP_400_BAD_REQUEST)
        swap_request.cancel()
        swap_request.save()
        Verbs.cancelled.send(swap_request.requester, swap_request)
        sender = MailBuilder.swap_cancelled(swap_request)
        sender.send()
        serializer = SwapRequestSerializer()
        serialized = serializer.to_representation(swap_request)
        return views.Response(serialized)


class IncomingRequestsViewSet(CachedViewSetMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                              viewsets.GenericViewSet):
    queryset = SwapRequest.objects.all().exclude(requested_archived=True)
    serializer_class = SwapRequestSerializer
    permission_classes = [IsSuperUserOrOwner]
    cache_kwargs_key = 'user_pk'
    cache_obj_keys = ['requester_id', 'requested_id']

    def get_queryset(self):
        user_id = self.kwargs.get('user_pk')
        return self.queryset.filter(requested_id=user_id)\
            .select_related('requester').select_related('requested')

    @detail_route(methods=['post'], serializer_class=AcceptRequestSerializer)
    def accept(self, request, user_pk, pk):
        swap_request = SwapRequest.objects.get(pk=pk)
        if swap_request.requested.id != int(user_pk):
            msg = "Only who is requested can accept a Swap Request"
            return views.Response(msg, status=HTTP_400_BAD_REQUEST)
        serializer = AcceptRequestSerializer(data=request.data,
                                             instance=swap_request)
        if not serializer.is_valid():
            return views.Response(serializer.errors,
                                  status=HTTP_400_BAD_REQUEST)
        swap_request.requested_game_condition_notes = \
            serializer.data['requested_game_condition_notes']
        swap_request.accept()
        swap_request.save()
        Verbs.accepted.send(swap_request.requested, swap_request)
        sender = MailBuilder.swap_accepted(swap_request)
        sender.send()

        expire_days = timedelta(settings.EXPIRE_OLD_ONGOING_REQUESTS_IN_DAYS)
        expire_date = swap_request.accepted_at + expire_days
        for days in settings.NOTIFICATION_DAYS_BEFORE_EXPIRE:
            sender = MailBuilder.swap_expire_notification(swap_request, days)
            sender.schedule(expire_date - timedelta(days))

        serializer = SwapRequestSerializer()
        serialized = serializer.to_representation(swap_request)
        return views.Response(serialized)

    @detail_route(methods=['post'],
                  serializer_class=RefuseRequestSerializer)
    def refuse(self, request, user_pk, pk):
        swap_request = SwapRequest.objects.get(pk=pk)
        if swap_request.requested.id != int(user_pk):
            msg = "Only who is requested can refuse a Swap Request"
            return views.Response(msg, status=HTTP_400_BAD_REQUEST)
        serializer = RefuseRequestSerializer(data=request.data,
                                             instance=swap_request)
        if not serializer.is_valid():
            return views.Response(serializer.errors,
                                  status=HTTP_400_BAD_REQUEST)
        swap_request.refuse()
        swap_request.save()
        sender = MailBuilder.swap_refused(swap_request)
        sender.send()
        Verbs.refused.send(swap_request.requested, swap_request)
        serializer = SwapRequestSerializer()
        serialized = serializer.to_representation(swap_request)
        return views.Response(serialized)


class SwapRequestFilter(FilterSet):
    status_id = BaseInFilter(name="status", lookup_expr="in")

    class Meta:
        model = SwapRequest
        fields = ['status_id']


class AllRequestsViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin,
                         viewsets.GenericViewSet):
    queryset = SwapRequest.objects.all()
    serializer_class = SwapRequestSerializer
    permission_classes = [IsSuperUserOrOwner]
    filter_backends = (OrderingFilter, DjangoFilterBackend)
    filter_class = SwapRequestFilter

    def get_queryset(self):
        user_id = self.kwargs.get('user_pk')
        return self.queryset.filter(Q(requested_id=user_id) |
                                    Q(requester_id=user_id)) \
                .select_related('requester').select_related('requested')

    @detail_route(methods=['post'],
                  serializer_class=FinalizeFirstRequestSerializer)
    def finalize(self, request, user_pk, pk):
        swap_request = SwapRequest.objects.get(pk=pk)
        user = User.objects.get(pk=user_pk)
        first = True
        serializer_class = FinalizeFirstRequestSerializer
        if swap_request.is_finalizing:
            first = False
            serializer_class = FinalizeSecondRequestSerializer
        serializer = serializer_class(data=request.data, instance=swap_request)
        if not serializer.is_valid():
            return views.Response(serializer.errors,
                                  status=HTTP_400_BAD_REQUEST)
        if first:
            # NOTE: serializer.data won't work as the serializer fields doesn't
            # match the SwapRequest model, that's why using
            # serializer.validated_data instead.
            swap_request.finalize_first(user, **serializer.validated_data)
            swapped = serializer.validated_data['swapped']
            Verbs.finalized.send(user, swap_request)
            sender = MailBuilder.swap_finalized_first(swap_request, user,
                                                      swapped)
            sender.send()
            EmailSchedule.cancel('swap-expire-notification', swap_request,
                                 email=user.email)
        else:
            swap_request.finalize_second(user, **serializer.validated_data)
            Verbs.finalized.send(user, swap_request)
            EmailSchedule.cancel('swap-expire-notification', swap_request)

        swap_request.save()
        serializer = SwapRequestSerializer()
        serialized = serializer.to_representation(swap_request)
        return views.Response(serialized)

    @detail_route(methods=['post'],
                  serializer_class=ArchiveRequestSerializer)
    def archive(self, request, user_pk, pk):
        swap_request = SwapRequest.objects.get(pk=pk)
        user = User.objects.get(pk=user_pk)
        serializer = ArchiveRequestSerializer(data=request.data,
                                              instance=swap_request)
        if not serializer.is_valid():
            return views.Response(serializer.errors,
                                  status=HTTP_400_BAD_REQUEST)
        swap_request.archive(user)
        swap_request.save()
        Verbs.archived.send(user, swap_request)
        serializer = SwapRequestSerializer()
        serialized = serializer.to_representation(swap_request)
        return views.Response(serialized)

    @list_route(methods=['get'],
                serializer_class=ArchivedSwapRequestSerializer)
    def archived(self, request, user_pk):
        #queryset = self.filter_queryset(self.get_queryset())
        user_id = int(user_pk)
        queryset = self.queryset.filter(Q(requester_archived=True,
                                     requester_id=user_id) |
                                   Q(requested_archived=True,
                                     requested_id=user_id)) \
            .select_related('requester').select_related('requested') \
            .select_related('requester__address').select_related('requested__address') \
            .select_related('requester_game').select_related('requested_game')\
            .select_related('requester_game__platform').select_related('requested_game__platform')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return views.Response(serializer.data)

    @list_route(methods=['post'], serializer_class=SwapRequestSerializer,
                url_path='archive-all')
    def archive_all(self, request, user_pk):
        queryset = self.filter_queryset(self.get_queryset())
        user = User.objects.get(pk=user_pk)
        queryset = queryset.filter(status__in=Status.closed_statuses())
        requester_qs = queryset.filter(requester=user,
                                       requester_archived=False)
        requested_qs = queryset.filter(requested=user,
                                       requested_archived=False)
        my = requester_qs.values_list('id', flat=True)
        incoming = requested_qs.values_list('id', flat=True)
        count_requester = requester_qs.update(requester_archived=True)
        count_requested = requested_qs.update(requested_archived=True)
        cache_keys = [
            get_cache_key_for_viewset(MyRequestsViewSet, user.id),
            get_cache_key_for_viewset(IncomingRequestsViewSet, user.id)
        ]
        cache.delete_many(cache_keys)
        Verbs.archived_all.send(user)
        count = count_requester + count_requested
        return views.Response({'count': count, 'my': my, 'incoming': incoming})
