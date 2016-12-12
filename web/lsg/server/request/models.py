from datetime import timedelta
from itertools import chain
from geopy.distance import distance

from django.db import models
from django.conf import settings
from django.contrib.gis.measure import Distance


from jsonfield import JSONField

from games.models import Game
from utils import short_timesince
from .flow import StatusMethodsMixin, Status


from utils import Choices


class UsageCondition(Choices):
    bad = 'bad'
    good = 'good'
    very_good = 'very_good'


class Feedback(Choices):
    bad = -1
    neutral = 0
    good = 1


class SwapRequest(models.Model, StatusMethodsMixin):
    # REQUESTER fields below
    requester = models.ForeignKey('users.User', related_name="my_requests")
    requester_game = models.ForeignKey(Game, related_name="requester_requests")
    requester_feedback = models.SmallIntegerField(null=True, blank=True,
                                                  choices=Feedback.choices())
    requester_feedback_notes = models.CharField(max_length=1024,
                                                null=True, blank=True)
    requester_game_condition_notes = models.CharField(max_length=1024,
                                                      null=True, blank=True)
    requester_swapped = models.NullBooleanField(null=True, blank=True)
    requester_archived = models.BooleanField(default=False)

    # REQUESTED fields below
    requested = models.ForeignKey('users.User',
                                  related_name="incoming_requests")
    requested_game = models.ForeignKey(Game, related_name="requested_requests")
    requested_feedback = models.SmallIntegerField(null=True, blank=True,
                                             choices=Feedback.choices())
    requested_feedback_notes = models.CharField(max_length=1024,
                                                null=True, blank=True)
    requested_game_condition_notes = models.CharField(max_length=1024,
                                                      null=True, blank=True)
    requested_swapped = models.NullBooleanField(null=True, blank=True)
    requested_archived = models.BooleanField(default=False)

    # General request fields
    automatically_refused = models.NullBooleanField(null=True, blank=True)
    distance = models.DecimalField(decimal_places=2, max_digits=10)
    status = models.PositiveSmallIntegerField(choices=Status.choices(),
                                              default=Status.pending)
    status_history = JSONField(null=True, blank="")
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    finalized_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return "%s (%s) X %s (%s)" % (self.requester, self.requester_game,
                                      self.requested, self.requested_game)

    @property
    def distance(self):
        if not (self.requester.address.point and self.requested.address.point):
            # FIX SOMEHOW!!!!!
            return Distance(m=999999999999999)
        coords1 = self.requester.address.point.coords
        coords2 = self.requested.address.point.coords
        # must invert :/
        return Distance(m=distance((coords1[1], coords1[0]),
                                   (coords2[1], coords2[0])).meters)

    @property
    def closed_at_since(self):
        return short_timesince(self.closed_at)

    def cancel(self):
        self.status = Status.cancelled
        self.closed_at = timezone.now()

    def refuse(self, automatically_refused=False):
        self.status = Status.refused
        self.automatically_refused = automatically_refused
        self.finalized_at = timezone.now()
        self.closed_at = timezone.now()

    def accept(self):
        self.status = Status.ongoing
        self.accepted_at = timezone.now()

    def expire(self):
        self.status = Status.expired

    def finalize_first(self, user, swapped, other_feedback,
                       other_feedback_notes):
        self._finalize(user, swapped, other_feedback, other_feedback_notes)
        self.status = Status.finalizing

    def finalize_second(self, user, swapped, other_feedback,
                        other_feedback_notes):
        self._finalize(user, swapped, other_feedback, other_feedback_notes)
        self.finalized_at = timezone.now()
        self.closed_at = timezone.now()
        self.status = RequestFlow.get_final_status(self)  # success or failed

    def _finalize(self, user, swapped, other_feedback, other_feedback_notes):
        assert user == self.requester or user == self.requested, \
            "User must be either requester or requested"
        if user == self.requester:
            self.requester_swapped = swapped
            self.requested_feedback = other_feedback
            self.requested_feedback_notes = other_feedback_notes
        elif user == self.requested:
            self.requested_swapped = swapped
            self.requester_feedback = other_feedback
            self.requester_feedback_notes = other_feedback_notes

    def archive(self, user):
        if self.requester == user:
            self.requester_archived = True
        elif self.requested == user:
            self.requested_archived = True
        else:
            raise Exception('User %s cannot archive this SwapRequest as the '
                            'user is not either the requester or requested.' %
                            user.username)

    def get_similar_requests_for_the_requested(self, flat=False):
        """ Assuming that the "requested" is *me*, get all others requests
        related to game I wish for this request where *I* can be whether
        the "requested" or the "requester" for those other requests.
        If flat=False, it returns 2 QuerySets where the:
         - first: similar requests where I am the "requested";
         - second: similar requests where I am the "requester";
        If flat=True, it returns just one list of all SwapRequests together.
        :return: (QuerySet<SwapRequest>, QuerySet<SwapRequest>)
        :return: list<SwapRequest>
        """
        me = self.requested
        game_i_wish = self.requester_game
        game_i_have = self.requested_game

        # all requests where I was requested
        similar_requests_requested_i_wish = SwapRequest.objects.filter(
            status=Status.pending,
            requested=me,
            requester_game=game_i_wish
        ).exclude(id=self.id)
        similar_requests_requested_i_have = SwapRequest.objects.filter(
            status=Status.pending,
            requested=me,
            requested_game=game_i_have
        ).exclude(id=self.id)
        similar_requests_requested = list(
            chain(similar_requests_requested_i_wish,
                similar_requests_requested_i_have))

        # all requests where I am requester
        similar_requests_requester_i_wish = SwapRequest.objects.filter(
            status=Status.pending,
            requester=me,
            requested_game=game_i_wish
        ).exclude(id=self.id)
        similar_requests_requester_i_have = SwapRequest.objects.filter(
            status=Status.pending,
            requester=me,
            requester_game=game_i_have
        ).exclude(id=self.id)
        similar_requests_requester = list(
            chain(similar_requests_requester_i_wish,
                similar_requests_requester_i_have))

        if flat:
            return list(chain(similar_requests_requested,
                              similar_requests_requester))
        return similar_requests_requested, similar_requests_requester

    @classmethod
    def expire_old_ongoing_requests(cls):
        old_requests = cls.get_old_ongoing_requests()
        count = old_requests.update(status=Status.expired)
        return count

    @classmethod
    def expire_old_finalizing_requests(cls):
        old_requests = cls.get_old_finalizing_requests()
        count = old_requests.update(status=Status.expired)
        # TODO: ?? should we actually expire old finalizing requests? Or
        # TODO: maybe fail or succeed, depending on the first user feedback
        # TODO: and "swapped" attributes.
        return count

    @classmethod
    def get_old_ongoing_requests(cls):
        now = timezone.now()
        expire_days = settings.EXPIRE_OLD_ONGOING_REQUESTS_IN_DAYS
        days = timedelta(expire_days)
        days_ago = now - days
        old_requests = cls.objects.filter(status=Status.ongoing,
                                          accepted_at__lte=days_ago)
        return old_requests

    @classmethod
    def get_old_finalizing_requests(cls):
        now = timezone.now()
        expire_days = settings.EXPIRE_OLD_FINALIZING_REQUESTS_IN_DAYS
        days = timedelta(expire_days)
        days_ago = now - days
        old_requests = cls.objects.filter(status=Status.finalizing,
                                          accepted_at__lte=days_ago)
        return old_requests


from request. signals import *  # important!!

# UNARCHIVE ALL CODE SNIPPET
#from request.models import SwapRequest
#reqs = SwapRequest.objects.all()
#reqs.update(requester_archived=False)
#reqs.update(requested_archived=False)
