import re
from django.db import transaction

from scripts.base import BaseScript
from games.models import Game


class UpdateSimilarGames(BaseScript):
    name = "update_similar_games"

    digit_regex = re.compile(r'^\d+.*')
    roman_regex = re.compile(r'^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$')

    def chunks(self):
        size = 1000
        count = Game.objects.count()
        self.logger.info('Total of games: %s' % count)
        num_chunks = int(count / size) + 1
        self.logger.info('Processing %s chunks of size %s' % (num_chunks, size))
        chunks = ((i, Game.objects.all()[size * i:size * (i + 1)]) for i in range(num_chunks))
        return chunks

    def main(self):
        self.logger.info('Looking for similar games for the same platform.')
        cache = self.update_similares()
        self.update_ids(cache)

    @transaction.atomic
    def update_similares(self):
        cache = dict()
        for i, chunk in self.chunks():
            self.logger.info('Processing chunk #%s' % i)
            for game in chunk:
                gname = game.name
                prefix = ':'.join(gname.split(':')[:-1] if ':' in gname else [gname])
                if len(prefix) == 1:
                    self.logger.warning('Game 1 char name: "%s"' % str(gname))
                    prefix = gname
                    if len(prefix) == 1:
                        self.logger.warning('Continuing: "%s"' % str(gname))
                        continue
                similares = Game.objects.filter(name__contains=prefix,
                                                platform_id=game.platform_id) \
                                        .exclude(id=game.id)
                length = similares.count()
                cache.setdefault(game.id, {'game': game, 'similar': set(), 'similar_names': set(),
                                           'excluded_names': set()})
                count = 0
                for similar in similares:
                    name = similar.name
                    wout_prefix = name
                    startswith_prefix = False
                    if name.startswith(prefix):
                        startswith_prefix = True
                        wout_prefix = name.replace(prefix, '')
                        first = ''
                        if wout_prefix:
                            first = wout_prefix.split()[0].strip(':')
                    if startswith_prefix and \
                       ((wout_prefix.strip().startswith(':') or
                        (wout_prefix.strip().lower().endswith('edition') and
                         ':' not in wout_prefix)) or
                         self.digit_regex.match(wout_prefix.strip()) or
                         (first and self.roman_regex.match(first.upper())) or
                         (len(prefix.split()) >= 2 and wout_prefix.strip())):
                        count += 1
                        cache.setdefault(similar.id, {'game': similar, 'similar': set(),
                                                      'similar_names': set(),
                                                      'excluded_names': set()})
                        cache[game.id]['similar'].add(similar.id)
                        cache[game.id]['similar_names'].add(similar.name)
                        cache[similar.id]['similar'].add(game.id)
                        cache[similar.id]['similar_names'].add(game.name)
                    else:
                        cache[game.id]['excluded_names'].add(similar.name)
                if length > 10 and count:
                    self.logger.warning('"%s" has %s similares, %s after filtered.' % (str(game), length, count))

        self.logger.info('Adding games from cache...')
        for i, game in enumerate(cache.values()):
            if game['similar']:
                game['game'].similar_same_platform.clear()
                game['game'].similar_same_platform.add(*game['similar'])
                self.logger.debug('%s => %s' % (str(game['game']), ', '.join(game['similar_names'])))
                self.logger.debug('%s =(EXCLUDED)> %s' % (str(game['game']), ', '.join(game['excluded_names'])))
            if i % 1000 == 0:
                self.logger.info('%s games processed' % i)
        return cache

    @transaction.atomic
    def update_ids(self, cache):
        self.logger.info('Updating similar_same_platform_ids field.')
        for i, game_similar in enumerate(cache.values()):
            game = game_similar['game']
            ids = game_similar['similar']
            ids_str = ','.join(map(str, ids))
            if ids:
                game.similar_same_platform_ids = ids_str
                game.save()
            if i % 1000 == 0:
                self.logger.info('%s games processed' % i)


if __name__ == '__main__':
    script = UpdateSimilarGames()
    script.run_from_cli()
