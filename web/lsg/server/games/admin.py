from django.contrib import admin

from games.models import Platform, Game


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('name', 'platform', 'owned_count', 'wanted_count', 'release', 'players',
                    'developer', 'publisher', 'api_id')
    list_filter = ('platform',)
    search_fields = ('name', 'developer')


@admin.register(Platform)
class PlatformAdmin(admin.ModelAdmin):
    list_display = ('name', 'developer', 'cpu', 'memory', 'graphics', 'sound',
                    'display', 'media', 'max_controllers', 'api_id')
    search_fields = ('name', 'developer')
