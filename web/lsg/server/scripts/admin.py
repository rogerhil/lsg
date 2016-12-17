from django.contrib import admin
from django.conf import settings
from django.http import HttpResponseRedirect
from django.core.urlresolvers import reverse

from admin_extra_urls.extras import ExtraUrlMixin, link

from scripts.models import Scripting, CeleryTask
from scripts.tasks import populate_games_db, populate_games_db_offline, download_boxart_images, \
    make_thumbnails, expire_old_ongoing_requests, send_scheduled_emails


@admin.register(Scripting)
class ScriptingAdmin(ExtraUrlMixin, admin.ModelAdmin):
    list_display = ('games_last_updated', 'games_images_last_updated',
                    'games_thumbnails_last_updated')

    def has_add_permission(self, request):
        return not Scripting.objects.all().count()

    @link(label="Update games")
    def update_games(self, request):
        async_result = populate_games_db.delay()
        path = reverse('watch_log', args=(async_result.task_id,))
        return HttpResponseRedirect(path)

    @link(label="Update games OFFLINE")
    def update_games(self, request):
        async_result = populate_games_db_offline.delay()
        path = reverse('watch_log', args=(async_result.task_id,))
        return HttpResponseRedirect(path)

    @link(label="Download images")
    def download_boxart_images(self, request):
        async_result = download_boxart_images.delay()
        path = reverse('watch_log', args=(async_result.task_id,))
        return HttpResponseRedirect(path)

    @link(label="Make thumbnails")
    def make_thumbnails(self, request):
        async_result = make_thumbnails.delay()
        path = reverse('watch_log', args=(async_result.task_id,))
        return HttpResponseRedirect(path)

    @link(label="Expire ongoing requests older than %s days" %
                settings.EXPIRE_OLD_ONGOING_REQUESTS_IN_DAYS)
    def expire_old_ongoing_requests(self, request):
        async_result = expire_old_ongoing_requests.delay()
        path = reverse('watch_log', args=(async_result.task_id,))
        return HttpResponseRedirect(path)

    @link(label="Send scheduled emails")
    def send_scheduled_email(self, request):
        async_result = send_scheduled_emails.delay()
        path = reverse('watch_log', args=(async_result.task_id,))
        return HttpResponseRedirect(path)


@admin.register(CeleryTask)
class CeleryTaskAdmin(ExtraUrlMixin, admin.ModelAdmin):
    list_display = ('id_link', 'name', 'status', 'task_id', 'created', 'log')

    def id_link(self, instance):
        path = reverse('watch_log', args=(instance.task_id,))
        return u'<a href="%s">%s (watch)</a>' % (path, instance.id)
    id_link.allow_tags = True
    id_link.short_description = "id"

    def has_add_permission(self, request):
        return False
