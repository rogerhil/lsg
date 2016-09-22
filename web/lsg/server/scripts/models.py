from celery.result import AsyncResult
from celery.states import READY_STATES

from datetime import datetime

from django.db import models
from django.db.models.signals import pre_save
from django.dispatch import receiver


class Scripting(models.Model):
    games_last_updated = models.DateTimeField(null=True, blank=True)
    games_images_last_updated = models.DateTimeField(null=True, blank=True)
    games_thumbnails_last_updated = models.DateTimeField(null=True, blank=True)

    @classmethod
    def instance(cls):
        try:
            return cls.objects.all()[0]
        except IndexError:
            return cls.objects.create()

    @classmethod
    def days_not_updated(cls, kind='games'):
        o = cls.instance()
        now = datetime.now()
        if not o.games_last_updated:
            return
        now = now.replace(tzinfo=getattr(o, '%s_last_updated' % kind).tzinfo)
        delta = now - o.games_last_updated
        return delta.days + 1


class CeleryTask(models.Model):
    name = models.CharField(max_length=128, editable=False)
    task_id = models.CharField(max_length=128, editable=False, unique=True)
    log = models.FilePathField(max_length=512, editable=False)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    scripting = models.ForeignKey(Scripting, editable=False)

    def __str__(self):
        return "%s (%s)" % (self.name, self.task_id)

    @classmethod
    def new(cls, name, task_id, log):
        return cls.objects.create(name=name, task_id=task_id, log=log,
                                  scripting=Scripting.instance())

    @property
    def status(self):
        async_result = AsyncResult(self.task_id)
        return str(async_result.state)

    def has_finished(self):
        return self.status in READY_STATES

    def terminate(self):
        async_result = AsyncResult(self.task_id)
        async_result.revoke(terminate=True)

    def kill(self):
        async_result = AsyncResult(self.task_id)
        async_result.revoke(terminate=True, signal='SIGKILL')


@receiver(pre_save, sender=Scripting)
def singleton(sender, instance=None, **kwargs):
    if not instance.id and Scripting.objects.all().count():
        raise Exception("Cannot exist more than 1 Scripting instances.")
