from django import http


class RedirectFallbackMiddleware(object):

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Code to be executed for each request before
        # the view (and later middleware) are called.

        response = self.get_response(request)
        if response.status_code == 404:
            return http.HttpResponseRedirect('/')

        return response
