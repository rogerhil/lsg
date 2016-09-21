"""lsg URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.10/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls import url, include, static
from django.contrib import admin
from django.views.static import serve as static_serve
from django.views.generic import TemplateView
from django.contrib.auth.decorators import user_passes_test, login_required
from django.views.decorators.csrf import csrf_exempt

from rest_framework_nested import routers

from mail.views import SwapRequestEmailPreview
from scripts.views import CeleryTaskLog, WatchCeleryTask, StopCeleryTask, \
    KillCeleryTask
from users.views import Logout, Done
from games.api.views import GameViewSet, PlatformViewSet
from users.api.views import UsersViewSet, CollectionItemViewSet, \
    WishlistViewSet, AuthenticatedUserView
from request.api.views import MyRequestsViewSet, IncomingRequestsViewSet, \
    AllRequestsViewSet

is_superuser = user_passes_test(lambda u: u.is_superuser, 'landing-page')
s = lambda v: csrf_exempt(is_superuser(v))

router = routers.DefaultRouter()
router.register('users', UsersViewSet)
users_router = routers.NestedSimpleRouter(router, r'users', lookup='user')
users_router.register('collection', CollectionItemViewSet)
users_router.register('wishlist', WishlistViewSet)
users_router.register('my_requests', MyRequestsViewSet)
users_router.register('incoming_requests', IncomingRequestsViewSet)
users_router.register('requests', AllRequestsViewSet)
router.register('games', GameViewSet)
router.register('platforms', PlatformViewSet)


urlpatterns = [
    url(r'^admin/scripts/celerytask/(?P<pk>\d+)/watch/$',
        WatchCeleryTask.as_view(), name='watch_log'),
    url(r'^admin/scripts/celerytask/(?P<task_id>[\w\-]+)/watch/$',
        WatchCeleryTask.as_view(), name='watch_log'),
    url(r'^admin/scripts/celerytask/(?P<pk>\d+)/stop/$',
        StopCeleryTask.as_view(), name='stop_task'),
    url(r'^admin/scripts/celerytask/(?P<pk>\d+)/kill/$',
        KillCeleryTask.as_view(), name='kill_task'),
    url(r'^admin/scripts/celerytask/(?P<pk>\d+)/log/$',
        CeleryTaskLog.as_view(), name='read_log'),
    url(r'^admin/', admin.site.urls),

    url(r'^$', TemplateView.as_view(template_name="landing-page.html"),
        name="landing-page"),
    url('', include('social.apps.django_app.urls', namespace='social')),
    url(r'^done/$', Done.as_view(), name='done'),
    url(r'^logout/$', Logout.as_view(), name='logout'),

    url(r'^mail/swap-request/(?P<template_name>[\w\-]+)/preview/',
        s(SwapRequestEmailPreview.as_view()),
        name="swap_request_email_preview"),

    url('^activity/', include('actstream.urls')),

    url(r'^api/users/authenticated/', AuthenticatedUserView.as_view()),
    url(r'^api/', include(router.urls)),
    url(r'^api/', include(users_router.urls)),

    url(r'^api-auth/', include('rest_framework.urls',
                               namespace='rest_framework')),
]


def serve(*args, **kwargs):
    response = static_serve(*args, **kwargs)
    response['Cache-Control'] = 'no-cache'
    return response


if settings.DEBUG:
    # static serving the Angular App for development mode
    #s = login_required(serve, login_url='landing-page')
    s = serve
    urlpatterns += [
        url(r'^app/(?:index.html)?$', s,
            kwargs=dict(path='index.html',
                        document_root=settings.STATIC_APP_ROOT), name="app"),
        url(r'^app/(?P<path>(vendor/.*|app/.*|server/.*))$', s,
            kwargs=dict(document_root=settings.STATIC_APP_ROOT)),
    ] + static.static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
