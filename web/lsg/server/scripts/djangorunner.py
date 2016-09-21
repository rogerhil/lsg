import os
from scripts.populate_games_db import PopulateGamesDb

from django.conf import settings

from games.models import GameScripting


class DjangoScriptRunner(object):

    scripts_dir = os.path.join(settings.BASE_DIR, 'server/scripts/')
    pids_dir = os.path.join(scripts_dir, 'pids/')
    logs_dir = os.path.join(scripts_dir, 'logs/')

    populate_name = 'populate_games_db.py'
    download_name = 'download_boxart_images.py'
    thumbnails_name = 'make_thumbnails.py'

    script_name = dict(
        populate=populate_name,
        download=download_name,
        thumbnail=thumbnails_name
    )

    script_path = dict(
        populate=os.path.join(scripts_dir, populate_name),
        download=os.path.join(scripts_dir, download_name),
        thumbnail=os.path.join(scripts_dir, thumbnails_name)
    )

    log_path = dict(
        populate=os.path.join(logs_dir, "%s_%%s.log" % populate_name),
        download=os.path.join(logs_dir, "%s_%%s.log" % download_name),
        thumbnail=os.path.join(logs_dir, "%s_%%s.log" % thumbnails_name)
    )

    def populate_games(self):
        days = GameScripting.days_not_updated()
        script = PopulateGamesDb()
        script.run(update_days=days)

    def read_log(self, name):
        with open(obj.log) as logfile:
            return logfile.read()

