from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver
from rest_framework_cache.cache import cache

from users.models import CollectionItem, WishlistItem, User
from users.exceptions import CollectionGameDeleteException
from request.models import SwapRequest
from request.api.views import MyRequestsViewSet, IncomingRequestsViewSet
from cache import get_cache_key_for_viewset


@receiver(pre_delete, sender=CollectionItem)
def check_collection_item_is_in_open_request(sender, instance=None, **kwargs):
    if instance.is_in_open_request():
        raise CollectionGameDeleteException('Cannot delete the game "%s" as '
                                            'it is involved in an open swap '
                                            'request.' % instance.game)


@receiver(pre_delete, sender=WishlistItem)
def check_wishlist_item_is_in_open_request(sender, instance=None, **kwargs):
    if instance.is_in_open_request():
        raise CollectionGameDeleteException('Cannot delete the game "%s" as '
                                            'it is involved in an open swap '
                                            'request.' % instance.game)


@receiver(post_save, sender=CollectionItem)
@receiver(pre_delete, sender=CollectionItem)
def clear_matches_cache_collection(sender, instance=None, **kwargs):
    ids = WishlistItem.objects.filter(game=instance.game)\
                              .exclude(user=instance.user)\
                              .values_list('user__id', flat=True)
    keys = [User.get_matches_cache_key_for(i) for i in set(ids)]
    if keys:
        keys.append(User.get_matches_cache_key_for(instance.user.id))
    cache.delete_many(keys)


@receiver(post_save, sender=WishlistItem)
@receiver(pre_delete, sender=WishlistItem)
def clear_matches_cache_wishlist(sender, instance=None, **kwargs):
    ids = CollectionItem.objects.filter(game=instance.game)\
                              .exclude(user=instance.user)\
                              .values_list('user__id', flat=True)
    keys = [User.get_matches_cache_key_for(i) for i in set(ids)]
    if keys:
        keys.append(User.get_matches_cache_key_for(instance.user.id))
    cache.delete_many(keys)


@receiver(post_save, sender=SwapRequest)
@receiver(pre_delete, sender=SwapRequest)
def clear_matches_cache_request_changed(sender, instance=None, **kwargs):
    games = [instance.requester_game, instance.requested_game]
    idsc = CollectionItem.objects.filter(game__in=games)\
                                .values_list('user__id', flat=True)
    idsw = WishlistItem.objects.filter(game__in=games)\
                                .values_list('user__id', flat=True)
    keys = [User.get_matches_cache_key_for(i) for i in set(idsc)]
    keys += [User.get_matches_cache_key_for(i) for i in set(idsw)]
    if keys:
        keys.append(User.get_matches_cache_key_for(instance.requester.id))
        keys.append(User.get_matches_cache_key_for(instance.requested.id))
    cache.delete_many(keys)


@receiver(post_save, sender=User)
def clear_matches_and_requests_cache_user_changed(sender, instance=None,
                                                  **kwargs):
    keys = [
        User.get_matches_cache_key_for(instance.id),
        get_cache_key_for_viewset(MyRequestsViewSet, instance.id),
        get_cache_key_for_viewset(IncomingRequestsViewSet, instance.id)
    ]
    ids = SwapRequest.objects.filter(requester=instance,
                                     requested_archived=False)\
                             .values_list('requested_id', flat=True)
    keys += [get_cache_key_for_viewset(IncomingRequestsViewSet, i)
             for i in set(ids)]
    ids = SwapRequest.objects.filter(requested=instance,
                                     requester_archived=False)\
                             .values_list('requester_id', flat=True)
    keys += [get_cache_key_for_viewset(MyRequestsViewSet, i) for i in set(ids)]
    cache.delete_many(keys)
