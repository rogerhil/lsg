from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import AuthenticationForm
from django.views.generic import RedirectView, FormView, View
from django.http import HttpResponseForbidden
from django.core.urlresolvers import reverse


class Logout(RedirectView):

    permanent = False

    def get_redirect_url(self, *args, **kwargs):
        logout(self.request)
        return '/'


class Done(RedirectView):

    permanent = False

    def get_redirect_url(self, *args, **kwargs):
        return "/app/#/app/welcome"


class Forbidden(View):

    def get(self, *args, **kwargs):
        return HttpResponseForbidden('aaaaaaa')
