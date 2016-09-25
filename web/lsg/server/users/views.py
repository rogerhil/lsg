from django.contrib.auth import logout
from django.views.generic import RedirectView


class Logout(RedirectView):

    permanent = False

    def get_redirect_url(self, *args, **kwargs):
        logout(self.request)
        return '/'


class Done(RedirectView):

    permanent = False

    def get_redirect_url(self, *args, **kwargs):
        return "/app/#/app/welcome"
