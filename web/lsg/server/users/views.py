from django.contrib.auth import logout
from django.views.generic import RedirectView, TemplateView
from django.http import Http404

from users.models import User
from request.models import SwapRequest


class Logout(RedirectView):

    permanent = False

    def get_redirect_url(self, *args, **kwargs):
        logout(self.request)
        return '/'


class Done(TemplateView):

    template_name = 'registration-done.html'

    def get_context_data(self, **kwargs):
        # FRIENDS LIST
        #import requests
        #social = self.request.user.social_auth.get(provider='google-oauth2')
        #resp = requests.get('https://www.googleapis.com/plus/v1/people/me/people/visible',
        #                    params={'access_token': social.extra_data['access_token']})
        #print(resp.json())
        #print(resp.json()['items'])
        #import pdb; pdb.set_trace()

        #return "/congratulations/"
        #return "/app/#/app/welcome"
        if self.request.user.is_authenticated():
            return super(Done, self).get_context_data(**kwargs)
        else:
            raise Http404('User not authenticated')


class AdminStatisticsView(TemplateView):
    template_name = 'admin/statistics.html'

    def get_context_data(self, **kwargs):
        matches = []
        for user in User.objects.filter(deleted=False, accepted_terms=True, enabled=True):
            matches.append((user, user.matches))
        kwargs['matches'] = matches
        kwargs['requests'] = SwapRequest.objects.all()\
            .select_related('requester').select_related('requested') \
            .select_related('requester_game') \
            .select_related('requested_game') \
            .select_related('requester_game__platform') \
            .select_related('requested_game__platform')
        return super(AdminStatisticsView, self).get_context_data(**kwargs)
