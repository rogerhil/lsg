from django.apps import AppConfig


class RequestConfig(AppConfig):
    name = 'request'

    def ready(self):
        from actstream import registry
        registry.register(self.get_model('SwapRequest'))
