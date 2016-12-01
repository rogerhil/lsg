import logging
from decimal import Decimal, ROUND_UP
from copy import deepcopy
from functools import reduce
from rest_framework_cache.cache import cache
from rest_framework_cache.settings import api_settings

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.gis.measure import Distance

from games.models import Game, Platform
from world.models import Address
from request.models import SwapRequest, Status
from utils import Choices, distance_format

logger = logging.getLogger('django')


class Discard(Choices):
    easily = 1
    maybe = 2
    hardly = 3


class Gender(Choices):
    male = 'male'
    female = 'female'


class DistanceUnit(Choices):
    km = 'km'
    miles = 'mi'


class CollectionItem(models.Model):
    user = models.ForeignKey('User')
    game = models.ForeignKey(Game)
    weight = models.PositiveSmallIntegerField(choices=Discard.choices(),
                                              default=Discard.hardly,
                                              blank=True)

    def __str__(self):
        return "%s: %s (%s)" % (self.user, self.game, self.weight)

    def get_related_open_requests(self):
        open_statuses = Status.open_statuses()
        requested = SwapRequest.objects.filter(
            requested_game_id=self.game.id,
            requested_id=self.user.id,
            status__in=open_statuses)
        requester = SwapRequest.objects.filter(
            requester_game_id=self.game.id,
            requester_id=self.user.id,
            status__in=open_statuses)
        return requested, requester

    def is_in_open_request(self):
        requested, requester = self.get_related_open_requests()
        return requested.exists() or requester.exists()


class WishlistItem(models.Model):
    user = models.ForeignKey('User')
    game = models.ForeignKey(Game)

    def __str__(self):
        return "%s: %s" % (self.user, self.game)

    def get_related_open_requests(self):
        open_statuses = Status.open_statuses()
        requested = SwapRequest.objects.filter(
            requested_game_id=self.game.id,
            requester_id=self.user.id,
            status__in=open_statuses)
        requester = SwapRequest.objects.filter(
            requester_game_id=self.game.id,
            requested_id=self.user.id,
            status__in=open_statuses)
        return requested, requester

    def is_in_open_request(self):
        requested, requester = self.get_related_open_requests()
        return requested.exists() or requester.exists()


class User(AbstractUser):
    social_picture_url = models.URLField(null=True, blank=True)
    picture_image = models.ImageField(upload_to='upload/img/users/%Y/%m/%d/',
                                      null=True, blank=True)
    gender = models.CharField(max_length=10, null=True, blank=True,
                              choices=Gender.choices())
    address = models.ForeignKey(Address, null=True, blank=True, on_delete=models.SET_NULL)
    phone1_prefix = models.CharField(max_length=3, blank=True)
    phone1 = models.CharField(max_length=16, blank=True)
    platforms = models.ManyToManyField(Platform)
    succeeded_swaps_count = models.PositiveIntegerField(default=0)
    failed_swaps_count = models.PositiveIntegerField(default=0)
    expired_swaps_count = models.PositiveIntegerField(default=0)
    negative_feedback_count = models.PositiveIntegerField(default=0)
    positive_feedback_count = models.PositiveIntegerField(default=0)
    neutral_feedback_count = models.PositiveIntegerField(default=0)
    distance_unit = models.CharField(max_length=10, default=DistanceUnit.miles,
                                     choices=DistanceUnit.choices())
    deleted = models.BooleanField(default=False)
    deleted_date = models.DateTimeField(null=True, blank=True)
    enabled = models.BooleanField(default=False)

    wishlist = models.ManyToManyField(Game, related_name="wished",
                                      through=WishlistItem,
                                      editable=False)
    collection = models.ManyToManyField(Game, related_name="collections",
                                        through=CollectionItem,
                                        editable=False)

    def __str__(self):
        return self.name

    @property
    def name(self):
        return self.first_name or self.username

    @property
    def rating(self):
        negative = Decimal(self.negative_feedback_count)
        positive = Decimal(self.positive_feedback_count)
        total = negative + positive
        return positive / total if total else Decimal(0)

    @property
    def rating_percentage(self):
        percentage = self.rating * 100
        return "%s%%" % percentage.quantize(Decimal("0"), ROUND_UP)

    @property
    def stars(self):
        return int((self.rating * 5).quantize(Decimal("0"), ROUND_UP))

    @property
    def picture(self):
        img = self.picture_image
        return img.url if img else '/static/img/user-icon.svg'

    @property
    def _address(self):
        return self.address or Address()

    @property
    def social_links(self):
        prov_links = {
            'google-oauth2': dict(name='Google+',
                                  slug="gplus",
                                  link='https://plus.google.com/%s'),
            'facebook': dict(name='Facebook',
                             slug="facebook",
                             link='https://www.facebook.com/%s'),
            'twitter': dict(name='Twitter',
                            slug="twitter",
                            link='https://twitter.com/%s')
        }
        links = [(prov_links[i.provider]['name'],
                  prov_links[i.provider]['link'] %
                  (i.extra_data['access_token']['screen_name']
                   if i.provider == 'twitter' else i.extra_data.get('id')),
                  prov_links[i.provider]['slug'])
                 for i in self.social_auth.all()]
        return links


    @staticmethod
    def user_last_feedbacks(user_id, last=8):
        statuses = Status.closed_statuses()
        requests1 = SwapRequest.objects.filter(requester_id=user_id,
                                               status__in=statuses)\
                               .exclude(requester_feedback_notes=None)\
                               .select_related('requested') \
                               .order_by('-closed_at')[:last]
        requests2 = SwapRequest.objects.filter(requested_id=user_id,
                                               status__in=statuses)\
                               .exclude(requested_feedback_notes=None) \
                               .select_related('requester') \
                               .order_by('-closed_at')[:last]
        feedbacks = []
        for request in requests1:
            feedbacks.append(dict(
                user=request.requested,
                notes=request.requester_feedback_notes,
                feedback=request.requester_feedback,
                closed_at=request.closed_at,
                closed_at_since=request.closed_at_since
            ))
        for request in requests2:
            feedbacks.append(dict(
                user=request.requester,
                notes=request.requested_feedback_notes,
                feedback=request.requested_feedback,
                closed_at=request.closed_at,
                closed_at_since=request.closed_at_since
            ))
        feedbacks.sort(key=lambda x: x['closed_at'], reverse=True)
        return feedbacks[:last]

    def last_feedbacks(self, last=8):
        return self.user_last_feedbacks(self.id, last)

    def _categorized_games(self, games):
        categorized = {}
        for game in games:
            if isinstance(game, CollectionItem):
                weight = game.weight
                game = game.game
                game.weight = weight
            categorized.setdefault(game.platform.name, [])
            categorized[game.platform.name].append(game)

        for alist in categorized.values():
            alist.sort(key=lambda x: x.name)

        return sorted(categorized.items(), key=lambda x: x[0])

    def is_complete(self):
        return self.address and len(self.platforms.all()) > 0

    @property
    def phone1_display(self):
        return "+%s %s" % (self.phone1_prefix, self.phone1)

    @property
    def phones(self):
        phones = [self.phone1_display]
        return ', '.join([i for i in phones if i])

    @property
    def categorized_collection_games(self):
        collection = CollectionItem.objects.filter(user=self)
        return self._categorized_games(collection)

    @property
    def categorized_wishlist_games(self):
        return self._categorized_games(self.wishlist.all())

    @property
    def matches_by_username(self):
        games_collections = CollectionItem.objects \
            .filter(game__in=self.wishlist.all()) \
            .exclude(user=self)
        matches = dict()
        for game_collection in games_collections:
            user = game_collection.user
            username = user.username
            qs = Address.objects.distance(self.address.point)
            address = qs.get(id=user.address.id)
            for my_game in self.collection.all():
                for game_he_wishes in user.wishlist.all():
                    if my_game.id == game_he_wishes.id:
                        matches.setdefault(username,
                                           dict(iwish=set(), swap=set(),
                                                lat=user.address.point[1],
                                                lng=user.address.point[0],
                                                distance=address.distance
                                                ))
                        matches[username]['iwish'].add(game_collection.game)
                        matches[username]['swap'].add(my_game)
        all_matches = matches.items()
        return sorted([i for i in all_matches], key=lambda a: a[1]['distance'])

    @property
    def matches(self):
        if not self.address.point:
            logger.debug('User %s has no point address "%s"' %
                         (self, self.address))
            return []
        games_collections = CollectionItem.objects \
            .filter(game_id__in=self.wishlist.all().values_list('id'),
                    user__deleted=False) \
            .exclude(user=self)\
            .select_related('user')\
            .select_related('game') \
            .select_related('game__platform') \
            .select_related('user__address')

        my_pending_tuples = SwapRequest.objects.filter(requester=self,
                          status=Status.pending).values_list('requested_id',
                                                           'requested_game_id',
                                                           'requester_game_id')
        inc_pending_tuples = SwapRequest.objects.filter(requested=self,
                          status=Status.pending).values_list('requester_id',
                                                           'requester_game_id',
                                                           'requested_game_id')

        my_req_my_pending = set([i[2] for i in my_pending_tuples])
        inc_my_pending = set([i[2] for i in inc_pending_tuples])

        all_my_pending_games = my_req_my_pending | inc_my_pending

        my_req_iwish_pending = set([i[1] for i in my_pending_tuples])
        inc_iwish_pending = set([i[1] for i in inc_pending_tuples])

        all_iwish_pending_games = my_req_iwish_pending | inc_iwish_pending

        statuses = [Status.ongoing, Status.finalizing]
        iwish_iswap_my = SwapRequest.objects.filter(requester=self,
                                                    status__in=statuses)\
                                            .values_list('requested_game_id',
                                                         'requester_game_id')
        iwish_iswap_inc = SwapRequest.objects.filter(requested=self,
                                                     status__in=statuses)\
                                             .values_list('requester_game_id',
                                                          'requested_game_id')
        unzip = lambda x: zip(*x) if x else [(), ()]
        iwish_my, iswap_my = unzip(iwish_iswap_my)
        iwish_inc, iswap_inc = unzip(iwish_iswap_inc)
        iwish_in_requests = set(iwish_my) | set(iwish_inc)
        iswap_in_requests = set(iswap_my) | set(iswap_inc)

        qs = Address.objects.distance(self.address.point)
        matches = dict()

        address_cache = {}
        users_wishlist_cache = {}

        my_collection = self.collection.all().select_related('platform')

        for game_collection in games_collections:
            user = game_collection.user
            if user.address.id not in address_cache:
                address_cache[user.address.id] = qs.get(id=user.address.id)
            user.address = address_cache[user.address.id]
            if user.address.distance is None:
                logger.error("Error while trying to find matches for user %s. "
                             "User %s doesn't have distance information: %s" %
                             (self, user, user.address))
                continue
            if int(user.address.distance.km) > 9000:
                logger.warn("Ignoring match for user %s: user %s is %skm far: %s" %
                             (self, user, user.address.distance.km, user.address))
                continue
            if user.id not in users_wishlist_cache:
                users_wishlist_cache[user.id] = user.wishlist.all()\
                                                    .select_related('platform')
            for my_game in my_collection:
                for game_he_wishes in users_wishlist_cache[user.id]:
                    if my_game.id == game_he_wishes.id:
                        # matched!!!
                        iwish = deepcopy(game_collection.game)  # important
                        iwish.swap_pending = False
                        my_game.swap_pending = False

                        tup = (user.id, iwish.id, my_game.id)
                        # ignore those in my_requests and incoming requests
                        if tup in my_pending_tuples or tup in inc_pending_tuples:
                            continue

                        # mark games I wish as "swap_pending" if they are
                        if iwish.id in all_iwish_pending_games:
                            iwish.swap_pending = True

                        # mark my pending games as "swap_pending" if they are
                        if my_game.id in all_my_pending_games:
                            my_game.swap_pending = True

                        # mark matches that would be impossible to happen as
                        # the users are in process of swapping (Ongoing or
                        # Finalizing)
                        my_game.cannot_request = False
                        my_game.ongoing = False
                        ongoing = False

                        if my_game.id in iswap_in_requests or \
                           game_collection.game.id in iwish_in_requests:
                            my_game.cannot_request = True
                        if game_collection.game.id in iwish_in_requests:
                            ongoing = True
                        if my_game.id in iswap_in_requests:
                            my_game.ongoing = True

                        match = dict(
                            iwish=iwish,
                            count=0,
                            swaps={},
                            ongoing=ongoing,
                            no_games_left=False,
                        )
                        matches.setdefault(iwish.id, match)
                        matches[iwish.id]['count'] += 1
                        matches[iwish.id]['swaps'].setdefault(user.id,
                            dict(user=user, wanted_games=[]))
                        matches[iwish.id]['swaps'][user.id]['wanted_games']\
                            .append(my_game)

        for match in matches.values():
            match['swaps'] = list(match['swaps'].values())
            all_wanted_games = reduce(lambda a, b: a + b,
                                   [s['wanted_games'] for s in match['swaps']])
            match['no_games_left'] = all([g.ongoing for g in all_wanted_games])
            match['swaps'].sort(key=lambda p: p['user'].rating)
            match['swaps'].sort(key=lambda p: p['user'].succeeded_swaps_count,
                                reverse=True)
            match['swaps'].sort(key=lambda p: p['user'].address.distance)
        return matches.values()

    @staticmethod
    def get_collection_cache_key_for(user_id):
        return "collection_%s" % user_id

    @staticmethod
    def get_wishlist_cache_key_for(user_id):
        return "wishlist_%s" % user_id

    @staticmethod
    def get_matches_cache_key_for(user_id):
        return "matches_%s" % user_id

    @property
    def collection_cache_key(self):
        return self.get_collection_cache_key_for(self.id)

    @property
    def matches_cache_key(self):
        return self.get_matches_cache_key_for(self.id)

    @property
    def serialized_matches(self):
        cache_key = self.matches_cache_key
        cached = cache.get(cache_key)
        if cached:
            return cached

        from games.api.serializers import GameSerializer
        from users.api.serializers import SmallUserSerializer
        gs = GameSerializer()
        us = SmallUserSerializer()
        serialized_matches = []
        for match in self.matches:
            iwish = gs.to_representation(match['iwish'])
            iwish['swap_pending'] = match['iwish'].swap_pending
            serialized_match = dict(
                iwish=iwish,
                count=match['count'],
                ongoing=match['ongoing'],
                no_games_left=match['no_games_left'],
                swaps=[]
            )
            for swap in match['swaps']:
                user = us.to_representation(swap['user'])
                user['feedback'] = swap['user'].rating
                dist = swap['user'].address.distance
                unit = self.distance_unit
                distance = Decimal(getattr(dist, unit)).quantize(Decimal(".1"),
                                                                 ROUND_UP)
                user['address'] = {}
                user['address']['distance'] = str(distance)
                user['address']['distance_display'] = distance_format(dist,
                                                                      unit)
                games = []
                for game_obj in swap['wanted_games']:
                    game = gs.to_representation(game_obj)
                    game['cannot_request'] = game_obj.cannot_request
                    game['ongoing'] = game_obj.ongoing
                    game['swap_pending'] = game_obj.swap_pending
                    games.append(game)
                serialized_match['swaps'].append(dict(user=user,
                                                      wanted_games=games))
            serialized_matches.append(serialized_match)
        cache.set(cache_key, serialized_matches,
                  api_settings.DEFAULT_CACHE_TIMEOUT)
        return serialized_matches

    @property
    def my_requests(self):
        return SwapRequest.objects.filter(requester__user=self) \
            .exclude(status__in=Status.closed_statuses())

    @property
    def my_requests_ids(self):
        return self.my_requests.values_list('id', flat=True)

    @property
    def my_requests_ids_display(self):
        return ','.join(map(str, self.my_requests_ids))

    @property
    def incoming_requests(self):
        return SwapRequest.objects.filter(requested__user=self) \
            .exclude(status__in=Status.closed_statuses())

    @property
    def incoming_requests_ids(self):
        return self.incoming_requests.values_list('id', flat=True)

    @property
    def incoming_requests_ids_display(self):
        return ','.join(map(str, self.incoming_requests_ids))

    @classmethod
    def create_user_user(cls, sender, instance, created, **kwargs):
        if created:
            cls.objects.create(user=instance)


from users.signals import *
