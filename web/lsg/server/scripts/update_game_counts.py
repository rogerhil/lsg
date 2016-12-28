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
        for i, chunk in self.chunks_of('collection item', CollectionItem):
            self.logger.info('Processing chunk %s' % (i + 1))
            for collection_item in chunk:
                game_counts.setdefault(collection_item.game.id, dict(owned=0, wanted=0))
                game_counts[collection_item.game.id]['owned'] += 1
        for i, chunk in self.chunks_of('wish list item', WishlistItem):
            self.logger.info('Processing chunk %s' % (i + 1))
            for wishlist_item in chunk:
                game_counts.setdefault(wishlist_item.game.id, dict(owned=0, wanted=0))
                game_counts[wishlist_item.game.id]['wanted'] += 1

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
