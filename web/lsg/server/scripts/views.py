import json
import os
from subprocess import getstatusoutput

from django.views.generic import View, TemplateView, DetailView, RedirectView
from django.http import HttpResponse

from scripts.models import CeleryTask


class CeleryTaskLog(View):

    def dispatch(self, request, pk, *args, **kwargs):
        celery_task = CeleryTask.objects.get(pk=pk)
        if os.path.isfile(celery_task.log):
            with open(celery_task.log) as log_file:
                log = log_file.read()
        else:
            log = 'File "%s" does not exist. Maybe the script didn\'t start running yet.' % \
                  celery_task.log
        worker_log = getstatusoutput('tail -n 100 /app/logs/celery/worker.log')[1]
        log = '\n'.join(l for l in log.splitlines() if ' DEBUG ' not in l)
        data = dict(
            log=log,
            worker_log=worker_log,
            finished=celery_task.has_finished(),
            status=celery_task.status
        )
        return HttpResponse(json.dumps(data))


class WatchCeleryTask(DetailView):
    template_name = 'scripts/watch-task.html'
    queryset = CeleryTask.objects.all()
    slug_url_kwarg = 'task_id'
    slug_field = 'task_id'


class StopCeleryTask(DetailView):
    template_name = 'scripts/watch-task.html'
    queryset = CeleryTask.objects.all()

    def dispatch(self, request, pk, *args, **kwargs):
        celery_task = self.get_object()
        celery_task.terminate()
        data = dict(
            status=celery_task.status
        )
        return HttpResponse(json.dumps(data))


class KillCeleryTask(DetailView):
    template_name = 'scripts/watch-task.html'
    queryset = CeleryTask.objects.all()

    def dispatch(self, request, pk, *args, **kwargs):
        celery_task = self.get_object()
        celery_task.kill()
        data = dict(
            status=celery_task.status
        )
        return HttpResponse(json.dumps(data))
