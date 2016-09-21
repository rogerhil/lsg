import os

from celery import Celery

# set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.conf import settings

app = Celery('lsg')

# Using a string here means the worker will not have to
# pickle the object when using Windows.
app.config_from_object('django.conf:settings')
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)

app.conf.update(
    CELERY_RESULT_BACKEND='djcelery.backends.database:DatabaseBackend',
    CELERY_IGNORE_RESULT=False,
    #BROKER_URL='django://',
    BROKER_URL='amqp://guest:guest@rabbitmq:5672//',
    CELERY_ACCEPT_CONTENT=['json', 'msgpack', 'yaml', 'pickle'],
    CELERYBEAT_SCHEDULER="djcelery.schedulers.DatabaseScheduler"
)

#app.conf.update(
#    CELERY_RESULT_BACKEND='djcelery.backends.cache:CacheBackend',
#)

import djcelery
djcelery.setup_loader()


@app.task(bind=True)
def debug_task(self):
    print('Request: {0!r}'.format(self.request))
