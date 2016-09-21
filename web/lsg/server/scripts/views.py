import json
from django.views.generic import View, TemplateView, DetailView, RedirectView
from django.http import HttpResponse

from scripts.models import CeleryTask


class CeleryTaskLog(View):

    def dispatch(self, request, pk, *args, **kwargs):
        celery_task = CeleryTask.objects.get(pk=pk)
        with open(celery_task.log) as log_file:
            log = log_file.read()
        data = dict(
            log=log,
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
