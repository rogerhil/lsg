from django.contrib import admin
from admin_extra_urls.extras import ExtraUrlMixin

from .models import SwapRequest


@admin.register(SwapRequest)
class SwapRequestAdmin(ExtraUrlMixin, admin.ModelAdmin):
    list_display = ('requester', 'requester_game', 'requester_feedback',
                    'requester_game_condition_notes',
                    'requested', 'requested_game', 'requested_feedback',
                    'requested_game_condition_notes',
                    'status', 'created', 'updated')
