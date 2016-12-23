from scripts.base import BaseScript

from games.models import Game


class UpdateSimilarGames(BaseScript):
    name = "update_similar_games"

    def chunks(self):
        size = 1000
        count = Game.objects.count()
        self.logger.info('Total of games: %s' % count)
        num_chunks = int(count / size) + 1
        self.logger.info('Processing %s chunks of size %s' % (num_chunks, size))
        chunks = [Game.objects.all()[i:size * (i + 1)] for i in range(num_chunks)]
        return chunks

    def main(self):
        self.logger.info('Looking for similar games for the same platform.')
        ids_cache = dict()
        for i, chunk in enumerate(self.chunks()):
            self.logger.info('Processing chunk #%s' % i)
            for game in chunk:
                similares = Game.objects.filter(fts__search="'%s'" % game.name.replace("'", "''"),
                                                platform_id=game.platform_id)
                ids_cache.setdefault(game.id, [])
                for similar in similares:
                    ids_cache.setdefault(similar.id, [])
                    ids_cache[game.id].append(similar.id)
                    ids_cache[similar.id].append(game.id)
                    game.similar_same_platform.add(similar)
                    similar.similar_same_platform.add(game)
        # update ids
        self.update_similar_same_platform_ids(ids_cache)

    def update_similar_same_platform_ids(self, ids_cache=None):
        self.logger.info('Updating similar_same_platform_ids field.')
        for i, chunk in enumerate(self.chunks()):
            self.logger.info('Processing chunk #%s' % i)
            for game in chunk:
                if ids_cache:
                    ids = ids_cache[game.id]
                else:
                    ids = game.similar_same_platform.all().values_list('id', flat=True)
                if ids:
                    game.similar_same_platform_ids = ','.join(map(str, ids))
                    game.save()


if __name__ == '__main__':
    script = UpdateSimilarGames()
    script.run_from_cli()
