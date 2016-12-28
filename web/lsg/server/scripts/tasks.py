from django.utils import timezone
from celery import shared_task, task
from celery.signals import after_task_publish

from scripts.models import Scripting, CeleryTask
from scripts.populate_games_db import PopulateGamesDb, PopulateGamesDbOffline
from scripts.download_boxart_images import BoxartDownloader
from scripts.make_thumbnails import ThumbnailsMaker
from scripts.expire_old_ongoing_requests import ExpireOldOngoingRequests
from scripts.send_scheduled_emails import SendScheduledEmails
from scripts.update_similar_games import UpdateSimilarGames
from scripts.update_game_counts import UpdateGameCounts


@shared_task(bind=True, script_class=PopulateGamesDb)
def populate_games_db(self):
    days = Scripting.days_not_updated()
    script = self.script_class(self.request.id)
    script.run(update_days=days)
    scripting = Scripting.instance()
    scripting.games_last_updated = timezone.now()
    scripting.save()
    return True


@shared_task(bind=True, script_class=PopulateGamesDbOffline)
def populate_games_db_offline(self):
    script = self.script_class(self.request.id)
    script.run()
    return True


@shared_task(bind=True, script_class=BoxartDownloader)
def download_boxart_images(self):
    days = Scripting.days_not_updated('games_images')
    script = self.script_class(self.request.id)
    script.run(update_days=days)
    scripting = Scripting.instance()
    scripting.games_images_last_updated = timezone.now()
    scripting.save()
    return True


@shared_task(bind=True, script_class=ThumbnailsMaker)
def make_thumbnails(self):
    days = Scripting.days_not_updated('games_thumbnails')
    script = self.script_class(self.request.id)
    script.run(update_days=days)
    scripting = Scripting.instance()
    scripting.games_thumbnails_last_updated = timezone.now()
    scripting.save()
    return True


@shared_task(bind=True, script_class=ExpireOldOngoingRequests)
def expire_old_ongoing_requests(self):
    script = self.script_class(self.request.id)
    script.run()
    return True


@shared_task(bind=True, script_class=SendScheduledEmails)
def send_scheduled_emails(self):
    script = self.script_class(self.request.id)
    script.run()
    return True


@shared_task(bind=True, script_class=UpdateSimilarGames)
def update_similar_games(self):
    script = self.script_class(self.request.id)
    script.run()
    return True


@shared_task(bind=True, script_class=UpdateGameCounts)
def update_game_counts(self):
    script = self.script_class(self.request.id)
    script.run()
    return True


# ********************************* SIGNALS ********************************* #

@after_task_publish.connect
def task_sent_handler(sender=None, body=None, **kwargs):
    task_id = body['id']
    script_class = globals()[sender.split('.')[-1]].script_class
    log = script_class.build_log_filename(task_id)
    CeleryTask.new(sender, task_id, log)
