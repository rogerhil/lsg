from django.db import transaction

from scripts.base import BaseScript
from users.models import CollectionItem, WishlistItem
from games.models import Game


class UpdateGameCounts(BaseScript):
    name = "update_game_counts"

    def main(self):
        self.logger.info('Updating game counts, how many owned and how many wanted.')
        self.update_game_counts()

    @transaction.atomic
    def update_game_counts(self):
        game_counts = dict()
        filter = dict(user__deleted=False)
        for i, chunk in self.chunks_of('collection item', CollectionItem, filter=filter):
            self.logger.info('Processing chunk %s' % (i + 1))
            for collection_item in chunk:
                game_counts.setdefault(collection_item.game.id, dict(owned=0, wanted=0))
                game_counts[collection_item.game.id]['owned'] += 1
        for i, chunk in self.chunks_of('wish list item', WishlistItem, filter=filter):
            self.logger.info('Processing chunk %s' % (i + 1))
            for wishlist_item in chunk:
                game_counts.setdefault(wishlist_item.game.id, dict(owned=0, wanted=0))
                game_counts[wishlist_item.game.id]['wanted'] += 1

        c = Game.objects.exclude(owned_count=0).update(owned_count=0)
        self.logger.info('%s games with owned_count back to zero' % c)
        c = Game.objects.exclude(wanted_count=0).update(wanted_count=0)
        self.logger.info('%s games with wanted_count back to zero' % c)

        for i, chunk in self.chunks_of('games ids', list(game_counts.keys()), 100):
            self.logger.info('Processing chunk %s' % (i + 1))
            games = Game.objects.filter(id__in=chunk)
            for game in games:
                game.owned_count = game_counts[game.id]['owned']
                game.wanted_count = game_counts[game.id]['wanted']
                game.save()


if __name__ == '__main__':
    script = UpdateGameCounts()
    script.run_from_cli()
