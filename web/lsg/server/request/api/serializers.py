from rest_framework import serializers
from rest_framework.fields import ValidationError
#from rest_framework_cache.registry import cache_registry
#from rest_framework_cache.serializers import CachedSerializerMixin

from games.api.serializers import GameSerializer
from users.api.serializers import SmallUserSerializer, RequestUserSerializer
from users.activities import Verbs
from request.flow import RequestFlow, StatusException, Status
from request.models import SwapRequest, Feedback
from utils import distance_format


class SwapRequestSerializer(serializers.ModelSerializer):
    requester_id = serializers.IntegerField(write_only=True)
    requester_game_id = serializers.IntegerField(write_only=True)
    requested_id = serializers.IntegerField(write_only=True)
    requested_game_id = serializers.IntegerField(write_only=True)
    requester_game = GameSerializer(read_only=True)
    requested_game = GameSerializer(read_only=True)
    status_display = serializers.CharField(read_only=True)
    status_history_display = serializers.CharField(read_only=True)
    previous_status = serializers.IntegerField(read_only=True)
    previous_status_display = serializers.CharField(read_only=True)
    closed_at_since = serializers.CharField(read_only=True)
    #distance = serializers.DecimalField(decimal_places=1, max_digits=10)

    requester = RequestUserSerializer(read_only=True)
    requested = RequestUserSerializer(read_only=True)

    class Meta:
        model = SwapRequest
        read_only_fields = ('requested_game_condition_notes', 'status',
                            'requested_swapped', 'requester_swapped',
                            'requested_feedback', 'requester_feedback',
                            'created', 'updated', 'accepted_at', 'closed_at',
                            'finalized_at', 'status_history_display',
                            'previous_status', 'previous_status_display',
                            'closed_at_since')
        exclude = ('status_history',)
        depth = 2

    def to_representation(self, instance):
        serial = super(SwapRequestSerializer, self).to_representation(instance)
        if not instance.is_or_was_accepted:
            ser = SmallUserSerializer()
            serial['requester'] = ser.to_representation(instance.requester)
            serial['requested'] = ser.to_representation(instance.requested)
        request = self.context.get('request')
        if request:
            unit = request.user.distance_unit
            serial['distance_display'] = distance_format(instance.distance,
                                                         unit)
        return serial

    def create(self, *args, **kwargs):
        instance = super(SwapRequestSerializer, self).create(*args, **kwargs)
        Verbs.requested.send(instance.requester, instance)
        return instance

#cache_registry.register(SwapRequestSerializer)


class ArchivedSwapRequestSerializer(serializers.ModelSerializer):
    requester_game = GameSerializer(read_only=True)
    requested_game = GameSerializer(read_only=True)
    status_display = serializers.CharField(read_only=True)
    status_history_display = serializers.CharField(read_only=True)
    # previous_status = serializers.IntegerField(read_only=True)
    # previous_status_display = serializers.CharField(read_only=True)
    # closed_at_since = serializers.CharField(read_only=True)
    requester = SmallUserSerializer(read_only=True)
    requested = SmallUserSerializer(read_only=True)

    class Meta:
        model = SwapRequest
        fields = ('requester_game', 'requested_game', 'status_display',
                  'status_history_display', 'requester', 'requested', 'status')
        read_only_fields = fields
        depth = 0


class ChangeRequestStatusSerializerMixin(object):

    request_status = None

    def is_valid(self, raise_exception=False):
        if self.request_status is None:
            raise Exception('request_status attribute must be provided')
        statuses = self.request_status
        if not isinstance(statuses, tuple):
            statuses = (statuses,)
        is_valid = super(ChangeRequestStatusSerializerMixin, self)\
                                                     .is_valid(raise_exception)
        try:
            for status in statuses:
                RequestFlow.validate_change_status_to(self.instance, status)
        except StatusException as err:
            self._errors.setdefault('status', [])
            self._errors['status'].append(str(err))
            is_valid = False
        if not is_valid and raise_exception:
            raise ValidationError(self.errors)
        return is_valid


class AcceptRequestSerializer(ChangeRequestStatusSerializerMixin,
                              serializers.ModelSerializer):

    request_status = Status.ongoing

    class Meta:
        model = SwapRequest
        fields = ('requested_game_condition_notes',)


class RefuseRequestSerializer(ChangeRequestStatusSerializerMixin,
                              serializers.ModelSerializer):
    request_status = Status.refused

    class Meta:
        model = SwapRequest
        fields = ()


class CancelRequestSerializer(ChangeRequestStatusSerializerMixin,
                              serializers.ModelSerializer):
    request_status = Status.cancelled

    class Meta:
        model = SwapRequest
        fields = ()


class ArchiveRequestSerializer(serializers.ModelSerializer):

    class Meta:
        model = SwapRequest
        fields = ()

    def is_valid(self, raise_exception=False):
        swap_request = self.instance
        is_valid = super(ArchiveRequestSerializer, self)\
            .is_valid(raise_exception)
        if not swap_request.is_closed:
            self._errors.setdefault('archive', [])
            msg = 'Cannot archive a request in "%s" status' % \
                  swap_request.status_display
            self._errors['status'].append(msg)
            is_valid = False
        if not is_valid and raise_exception:
            raise ValidationError(self.errors)
        return is_valid

#cache_registry.register(ArchiveRequestSerializer)


class FinalizeRequestSerializer(ChangeRequestStatusSerializerMixin,
                                serializers.Serializer):
    swapped = serializers.BooleanField(required=True)
    other_feedback = serializers.ChoiceField(choices=Feedback.choices(),
                                             required=True)
    other_feedback_notes = serializers.CharField(required=True,
                                                 max_length=1024)

    class Meta:
        fields = ('swapped', 'other_feedback', 'other_feedback_notes')


class FinalizeFirstRequestSerializer(FinalizeRequestSerializer):
    request_status = Status.finalizing


class FinalizeSecondRequestSerializer(FinalizeRequestSerializer):
    request_status = (Status.succeeded, Status.failed)
