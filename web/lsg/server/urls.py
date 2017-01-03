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
from django.views.generic import TemplateView, RedirectView
from django.contrib.auth.decorators import user_passes_test, login_required
from django.views.decorators.csrf import csrf_exempt
from django.contrib.sitemaps.views import sitemap

from rest_framework_cache.registry import cache_registry
from rest_framework_nested import routers

from django.utils.module_loading import autodiscover_modules

from constants import ConstantsView
from mail.views import SwapRequestEmailPreview, SwapRequestEmailSendTest
from scripts.views import CeleryTaskLog, WatchCeleryTask, StopCeleryTask, \
    KillCeleryTask
from users.views import Logout, Done, AdminStatisticsView, CheckCacheView
from games.api.views import GameViewSet, PlatformViewSet
from users.api.views import UsersViewSet, CollectionItemViewSet, \
    WishlistViewSet, AuthenticatedUserView
from request.api.views import MyRequestsViewSet, IncomingRequestsViewSet, \
    AllRequestsViewSet
from sitemaps import HomeSitemap

is_superuser = user_passes_test(lambda u: u.is_superuser, 'landing-page')
s = lambda v: csrf_exempt(is_superuser(v))

cache_registry.autodiscover()

sitemaps = dict(
    home=HomeSitemap,
)

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

handler500 = RedirectView.as_view(url='/app/#/500')
handler400 = RedirectView.as_view(url='/app/#/400')
handler403 = RedirectView.as_view(url='/app/#/403')

urlpatterns = [
    url(r'^lsgmanagement/scripts/celerytask/(?P<pk>\d+)/watch/$',
        WatchCeleryTask.as_view(), name='watch_log'),
    url(r'^lsgmanagement/scripts/celerytask/(?P<task_id>[\w\-]+)/watch/$',
        WatchCeleryTask.as_view(), name='watch_log'),
    url(r'^lsgmanagement/scripts/celerytask/(?P<pk>\d+)/stop/$',
        StopCeleryTask.as_view(), name='stop_task'),
    url(r'^lsgmanagement/scripts/celerytask/(?P<pk>\d+)/kill/$',
        KillCeleryTask.as_view(), name='kill_task'),
    url(r'^lsgmanagement/scripts/celerytask/(?P<pk>\d+)/log/$',
        CeleryTaskLog.as_view(), name='read_log'),
    url(r'^lsgmanagement/', admin.site.urls),

    url(r'^$', TemplateView.as_view(template_name="landing-page.html"),
        name="landing-page"),
    url(r'^privacy-policy/$', TemplateView.as_view(template_name="privacy-policy.html"),
        name="privacy-policy"),
    url('', include('social.apps.django_app.urls', namespace='social')),
    url(r'^done/$', Done.as_view(), name='done'),
    url(r'^logout/$', Logout.as_view(), name='logout'),

    url(r'^lsgmanagement/statistics/', s(AdminStatisticsView.as_view()), name="admin_statistcts"),
    url(r'^lsgmanagement/check-cache/', s(CheckCacheView.as_view()), name="admin_check_cache"),

    url(r'^mail/swap-request/(?P<template_name>[\w\-]+)/preview/',
        s(SwapRequestEmailPreview.as_view()),
        name="swap_request_email_preview"),

    url(r'^mail/swap-request/(?P<template_name>[\w\-]+)/testsend/',
        s(SwapRequestEmailSendTest.as_view()),
        name="swap_request_email_test_send"),

    url('^activity/', include('actstream.urls')),

    url(r'^api/users/authenticated/', AuthenticatedUserView.as_view()),
    url(r'^api/constants/', ConstantsView.as_view()),
    url(r'^api/', include(router.urls)),
    url(r'^api/', include(users_router.urls)),

    url(r'^api-auth/', include('rest_framework.urls',
                               namespace='rest_framework')),

    url(r'^sitemap\.xml$', sitemap, {'sitemaps': sitemaps},
        name='django.contrib.sitemaps.views.sitemap'),
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

    import debug_toolbar
    urlpatterns += [
        url(r'^__debug__/', include(debug_toolbar.urls)),
    ]
