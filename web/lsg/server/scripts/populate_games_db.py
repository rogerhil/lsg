import os
from decimal import Decimal

from django.db.utils import IntegrityError
from datetime import datetime
from urllib.parse import urlencode
from urllib.error import HTTPError
from xml.parsers.expat import ExpatError

from thegamesdb.test.mockdb import MockException
from scripts.base import BaseScript

from games.models import Platform, Game, Genre


def to_date(d):
    try:
        return datetime.strptime(d, '%m/%d/%Y').date()
    except ValueError:
        try:
            return datetime.strptime(d, '%m/%Y').date()
        except ValueError:
            try:
                return datetime.strptime(d, '%Y').date()
            except ValueError:
                print("Invalid date: %s" % d)
                return None


def get_service_path_by_path_params(path, **params):
    params = dict([(k, v) for k, v in params.items() if v])
    qs = ("?%s" % urlencode(params) if params else "")
    service = "%s%s" % (path, qs)
    return service


class PopulateGamesDb(BaseScript):
    name = "populate_games_db"

    def save_xml(self, data, path, **params):
        service = get_service_path_by_path_params(path, **params)
        with open(os.path.join(self.xml_path, "%s.xml" % service), 'w') as xml:
            xml.write(data.decode('utf-8'))

    def main(self):
        platforms = self.api.platform.list()
        self.save_xml(self.api.last_response, self.api.platform.list_path)

        existent_platforms = Platform.objects.all() \
            .extra(select={'lower_name': 'lower(name)'}).order_by(
            '-lower_name')
        last_platform = existent_platforms[0].name.lower() \
            if existent_platforms.count() else None

        skip = self.skip_existent_platforms

        if skip:
            self.logger.info("Skipping prior platforms before %s" %
                             last_platform)

        for p in platforms:
            if p.name.lower() == last_platform:
                skip = False
            if skip:
                self.logger.warn(" * SKIPPING Platform: %s" % p)
                continue

            platform = self.save_platform(p)

            games = p.games()
            if self.games_ids:
                self.logger.info('Filtering games (total: %s): %s' %
                                 (len(self.games_ids), self.games_ids))
                games = [g for g in games if g.id in self.games_ids]
            total = len(games)
            self.logger.info("%s  -  %s games" % (p, total))

            platform_name_plus = p.name.lower()
            self.save_xml(self.api.last_response, self.api.platform.games_path,
                          platform=platform_name_plus)

            for i, g in enumerate(games):
                self.save_game(g, i, total, platform)

        self.logger.info('#########################')
        self.logger.info('Finished populating games')
        self.logger.info('#########################')
        self.logger.info('Starting saving similars...')
        skip = self.skip_existent_platforms
        for p in self.mocked_api.platform.list():
            if p.name.lower() == last_platform:
                skip = False
            if skip:
                continue
            self.save_similars(p)
            self.logger.info('---------------------')

    def save_platform(self, p):
        self.logger.info(" * Platform: %s" % p)
        platform, created = Platform.objects.get_or_create(api_id=p.id,
                                                           name=p.name)
        platform.overview = p.overview
        platform.console = p.console
        platform.controller = p.controller
        platform.developer = p.developer
        platform.cpu = p.cpu
        platform.memory = p.memory
        platform.graphics = p.graphics
        platform.sound = p.sound
        platform.display = p.display

        platform.media = p.media
        if p.maxcontrollers and p.maxcontrollers.isdigit():
            #  invalid literal for int() with base 10: '1 (Keyboard)'
            platform.max_controllers = int(p.maxcontrollers)
        else:
            if p.maxcontrollers:
                self.logger.warn("maxcontrollers for %s #%s: %s" % (p, p.id,
                                                         p.maxcontrollers))

        if getattr(p, 'rating', None):
            try:
                platform.api_rating = Decimal(p.rating).quantize(
                    Decimal(".1") ** 2)
            except Exception as err:
                self.logger.error("Error while trying to set '%s' platform "
                                  "rating to the value '%s'. Error: %s" %
                                  (p.name, getattr(p, 'rating',
                                                   'NO SUCH rating ATTRIBUTE'),
                                                    err))
        platform.save()
        self.save_xml(self.api.last_response, self.api.platform.get_path,
                      id=p.id)
        return platform

    def save_game(self, g, i, total, platform):
        save_anyway = False
        if i % 20 == 0:
            self.logger.info("%s games remaining for %s" % (total - i,
                                                            platform))
        try:
            game, created = Game.objects.get_or_create(api_id=g.id,
                                                       name=g.name,
                                                       platform=platform)
        except IntegrityError as err:
            self.logger.error("    INTEGRITY ERROR FOR %s #%s R(%s): %s" % (
                             g, g.id, g.releasedate, err))
            self.logger.debug("    Overview: %s" % g.overview)
            self.logger.debug('')
            try:
                game = Game.objects.get(api_id=g.id)
            except Game.DoesNotExist:
                self.logger.error("Game %s (%s) does not exist!!!" % (g, g.id))
                return
            save_anyway = True

        if not save_anyway and not created and \
                (game.overview or game.release or game.api_rating or
                     game.developer or game.publisher):
            return
        try:
            game.release = to_date(g.releasedate) if g.releasedate \
                else None
        except HTTPError as err:
            self.logger.error("ERROR! %s (#%s) - %s" % (g.name, g.id, err))
            return
        except Exception as err:
            self.logger.error("ERROR! %s (#%s) - %s" % (g.name, g.id, err))
            return

        try:
            game.overview = g.overview
        except ExpatError as err:
            self.logger.error("ERROR while parsing: %s" % err)
            return

        if g.players and g.players.isdigit():  # e.g: 4+
            game.players = int(g.players)
        else:
            if g.players:
                self.logger.warn("%s #%s - players: %s" % (g, g.id, g.players))

        if getattr(g, 'co_op', None):
            try:
                game.co_op = g.co_op.lower() == 'yes'
            except Exception as err:
                self.logger.error("Error while trying to set '%s' game co_op "
                                  "to the value '%s'. Error: %s" %
                                  (g.name, getattr(g, 'co_op',
                                   'NO SUCH rating ATTRIBUTE'), err))

        game.publisher = g.publisher
        game.developer = g.developer
        if getattr(g, 'rating', None):
            try:
                game.api_rating = Decimal(g.rating) \
                    .quantize(Decimal(".1") ** 2)
            except Exception as err:
                self.logger.error("Error while trying to set '%s' game rating "
                                  "to the value '%s'. Error: %s" %
                                  (g.name, getattr(g, 'rating',
                                   'NO SUCH rating ATTRIBUTE'), err))

        self.save_xml(self.api.last_response, self.api.game.get_path, id=g.id)
        try:
            game.save()
        except IntegrityError as err:
            self.logger.error("  !!! INTEGRITY ERROR FOR %s #%s R(%s): %s" %
                              (g, g.id, g.releasedate, err))
            return

        self.save_xml(self.api.last_response, self.api.game.get_path, id=g.id)

        genres = g.genres or {}

        for genre in genres.get('Genre', []):
            genre_db = Genre.objects.get_or_create(name=genre)[0]
            game.genres.add(genre_db)

        return game

    def save_similars(self, p):
        self.logger.info(" *** Similar association for %s" % p)
        games = p.games()
        if self.games_ids:
            self.logger.info('Filtering games (total: %s): %s' %
                             (len(self.games_ids), self.games_ids))
            games = [g for g in games if g.id in self.games_ids]
        length = len(games)
        for i, g in enumerate(games):
            if i % 100 == 0:
                self.logger.info("%s remaining" % (length - i))
            try:
                g.platform
            except MockException as err:
                self.logger.error("  **ERROR: %s" % err)
                continue
            try:
                game = Game.objects.get(api_id=int(g.id))
            except Game.DoesNotExist:
                self.logger.error("  DOES NOT EXIST: the game %s #%s does "
                                  "not exist on DB" % (g, g.id))
                continue
            sim = g.similar or {}
            if not 'Game' in sim:
                continue
            if int(sim['SimilarCount']) == 1:
                sim = [sim['Game']]
            else:
                sim = sim['Game']
            for similar in sim:
                try:
                    db_similar = Game.objects.get(api_id=int(similar['id']))
                except Game.DoesNotExist:
                    self.logger.error("  DOES NOT EXIST: the SIMILAR game #%s "
                                      "does not exist on DB" % str(similar))
                    continue
                game.similar.add(db_similar)
            game.similar_count = game.similar.all().count()
            game.save()


if __name__ == '__main__':
    script = PopulateGamesDb()
    script.run_from_cli()
