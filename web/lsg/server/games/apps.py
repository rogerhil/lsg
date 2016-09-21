from django.apps import AppConfig


class GamesConfig(AppConfig):
    name = 'games'

    def ready(self):
        from actstream import registry
        registry.register(self.get_model('Game'))
