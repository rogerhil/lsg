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
        # FRIENDS LIST
        #import requests
        #social = self.request.user.social_auth.get(provider='google-oauth2')
        #resp = requests.get('https://www.googleapis.com/plus/v1/people/me/people/visible',
        #                    params={'access_token': social.extra_data['access_token']})
        #print(resp.json())
        #print(resp.json()['items'])
        #import pdb; pdb.set_trace()

        #return "/congratulations/"
        return "/app/#/app/welcome"
