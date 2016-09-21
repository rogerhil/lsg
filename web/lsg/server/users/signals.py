from django.db.models.signals import pre_delete
from django.dispatch import receiver

from users.models import CollectionItem, WishlistItem
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
