from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver
from rest_framework_cache.cache import cache

from users.models import CollectionItem, WishlistItem, User
from users.exceptions import CollectionGameDeleteException


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
                              .values_list('id', flat=True)
    keys = [User.get_matches_cache_key_for(i) for i in ids]
    if keys:
        keys.append(User.get_matches_cache_key_for(instance.user.id))
    cache.delete_many(keys)


@receiver(post_save, sender=WishlistItem)
@receiver(pre_delete, sender=WishlistItem)
def clear_matches_cache_wishlist(sender, instance=None, **kwargs):
    ids = CollectionItem.objects.filter(game=instance.game)\
                              .exclude(user=instance.user)\
                              .values_list('id', flat=True)
    keys = [User.get_matches_cache_key_for(i) for i in ids]
    if keys:
        keys.append(User.get_matches_cache_key_for(instance.user.id))
    cache.delete_many(keys)
