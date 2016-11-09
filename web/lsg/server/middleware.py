import re

from django import http
from django.conf import settings


class RedirectFallbackMiddleware(object):

    static_extensions = 'css|html|jpg|jpeg|js|json|md|png|svg'
    app_static_regex = re.compile(r'/app/.*(%s)' % static_extensions)

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Code to be executed for each request before
        # the view (and later middleware) are called.

        response = self.get_response(request)
        #return response
        if request.path.startswith(settings.STATIC_URL) or \
           self.app_static_regex.match(request.path):
            return response

        if response.status_code == 404:
            #if request.user.is_authenticated():
            #    return http.HttpResponseRedirect('/app/')
            return http.HttpResponseRedirect('/')

        return response
