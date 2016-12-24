import re
from scripts.base import BaseScript

from games.models import Game


class UpdateSimilarGames(BaseScript):
    name = "update_similar_games"

    digit_regex = re.compile('^\d+.*')

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
        #names_cache = dict()
        for i, chunk in enumerate(self.chunks()):
            self.logger.info('Processing chunk #%s' % i)
            for game in chunk:
                prefix = ':'.join(game.name.split(':')[:-1]).lower()
                similares = Game.objects.filter(name__contains=prefix,
                                                platform_id=game.platform_id)\
                                        .exclude(id=game.id)
                ids_cache.setdefault(game.id, [])
                #names_cache.setdefault(game.id, [])
                for similar in similares:
                    name = similar.name.lower()
                    wout_prefix = name
                    startswith_prefix = False
                    if name.startswith(prefix):
                        startswith_prefix = True
                        wout_prefix = name.replace(prefix, '')
                    if startswith_prefix and (wout_prefix.startswith(':') or
                       (name.endswith('edition') and not self.digit_regex.match(wout_prefix))):
                        ids_cache.setdefault(similar.id, [])
                        ids_cache[game.id].append(similar.id)
                        ids_cache[similar.id].append(game.id)
                        game.similar_same_platform.add(similar)
                        similar.similar_same_platform.add(game)
                        #names_cache.setdefault(similar.id, [])
                        #names_cache[game.id].append(similar.name)
                        #names_cache[similar.id].append(game.name)
                #if ids_cache[game.id]:
                #    self.logger.debug(' * %s => %s' % (game.name, ', '.join(names_cache[game.id])))
        # update ids
        self.update_similar_same_platform_ids(ids_cache)

    def update_similar_same_platform_ids(self, ids_cache=None, names_cache=None):
        self.logger.info('Updating similar_same_platform_ids field.')
        for i, chunk in enumerate(self.chunks()):
            self.logger.info('Processing chunk #%s' % i)
            for game in chunk:
                if ids_cache:
                    ids = ids_cache[game.id]
                else:
                    ids = game.similar_same_platform.all().values_list('id', flat=True)
                ids_str = ','.join(map(str, ids))
                if ids:
                    #sim = ids_str
                    #if names_cache:
                    #    sim = ', '.join(names_cache[game.id])
                    #self.logger.debug('Ids for "%s" (#%s) => %s' % (str(game), game.id, sim))
                    game.similar_same_platform_ids = ids_str
                    game.save()


if __name__ == '__main__':
    script = UpdateSimilarGames()
    script.run_from_cli()
