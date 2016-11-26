import os
import django
import argparse
import logging

from datetime import timedelta
from time import time
from django.utils import timezone
from thegamesdb import TheGamesDb
from thegamesdb.base import GamesDbException
from thegamesdb.test.mockdb import TheGamesDbMock

if "DJANGO_SETTINGS_MODULE" not in os.environ:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    django.setup()

from django.conf import settings


class BaseScript(object):
    name = None
    default_xml_path = settings.SCRIPTS_XML_DIR
    log_path = settings.SCRIPTS_LOGS_DIR
    images_path = settings.GAMES_IMAGES_DIR
    parent_path = settings.GAMES_IMAGES_PARENT_DIR

    logger = None

    def __init__(self, sufix=None):
        if sufix is None:
            sufix = timezone.now().isoformat()
        self.log_file = self.build_log_filename(sufix)
        self.start = time()
        self.end = None
        self._xml_path = None
        self.games_ids = []
        self.skip_existent_platforms = False
        self.parser = argparse.ArgumentParser()
        self.setup_cli()
        self.api = TheGamesDb(20, 10)
        self.mocked_api = TheGamesDbMock(self.xml_path)

    @classmethod
    def build_log_filename(cls, sufix):
        log_file = os.path.join(cls.log_path, '%s_%s.log' % (cls.name, sufix))
        return log_file

    @classmethod
    def setup_logger(cls, log_file=None):
        cls.logger = logging.getLogger(cls.name)
        handler = logging.FileHandler(log_file)
        stdout_handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
        handler.setFormatter(formatter)
        stdout_handler.setFormatter(formatter)
        cls.logger.addHandler(handler)
        cls.logger.addHandler(stdout_handler)
        cls.logger.setLevel(logging.DEBUG)
        cls.logger.info('')
        cls.logger.info('#' * 80)
        cls.logger.info('# STARTING %s' % cls.name)
        cls.logger.info('')

    def setup_cli(self):
        self.parser.add_argument('-x', '--xml-path', dest='xml_path',
                                 metavar='', required=False)
        self.parser.add_argument('-s', '--skip-existent-platforms',
                                 required=False, action="store_true",
                                 dest='skip_existent_platforms')
        self.parser.add_argument('-g', '--games-ids', metavar='',
                                 dest='games_ids', required=False)
        self.parser.add_argument('-u', '--update-days', metavar='',
                                 dest='update_days', required=False)
        self.parser.add_argument('-l', '--log-file', metavar='',
                                 dest='log_file', required=False)

    @property
    def xml_path(self):
        return self._xml_path or self.default_xml_path

    @xml_path.setter
    def xml_path(self, value):
        self._xml_path = value

    def main(self):
        raise NotImplementedError

    def run_from_cli(self):
        cli_args = self.parser.parse_args()
        args = cli_args._get_args()
        kwargs = dict(cli_args._get_kwargs())
        self.run(*args, **kwargs)

    def run(self, xml_path=None, games_ids=None,
            skip_existent_platforms=False, update_days=None,
            log_file=None):
        self.setup_logger(log_file or self.log_file)

        if games_ids:
            self.logger.info('Specific games ids: %s' % games_ids)
            self.games_ids = [int(i.strip()) for i in
                              games_ids.split(',')]
        elif update_days:
            self.logger.info('Update days: %s' % update_days)
            seconds = int(update_days) * 24 * 60 * 60
            try:
                try:
                    updates = self.api.game.updates(seconds)
                except Exception as err:
                    self.logger.error("Error while trying to load games updates: %s" % str(err))
                    raise
                self.games_ids = updates['games'] or []
                self.logger.info('Games not updated: %s' % self.games_ids)
            except GamesDbException as err:
                if 'Time is greater than' not in str(err):
                    raise
                self.logger.warning("!!! Doing a full download: %s" % str(err))

        self.xml_path = xml_path
        self.skip_existent_platforms = skip_existent_platforms
        self.main()
        self.end = time() - self.start
        delta = timedelta(seconds=self.end)
        total_seconds = delta.seconds
        days = "%s days " % delta.days if delta.days else ""
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        t = '%s%s:%s:%s' % (days, hours, minutes, seconds)
        self.logger.info('Script "%s" took %s to run.' % (self.name, t))
