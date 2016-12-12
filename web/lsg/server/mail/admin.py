from django.contrib import admin
from django.views.generic import TemplateView
from django.template.loader import get_template
from django.template import Context

from request.models import SwapRequest
from mail.models import EmailSchedule


class EmailPreview(TemplateView):
    template_name = 'mail/swap-request.preview.html'

    def get_context_data(self, **kwargs):
        template = get_template("emails/%s.html" % kwargs['template_name'])
        rid = self.request.GET.get('id')
        if rid:
            swap_request = SwapRequest.objects.get(pk=rid)
        else:
            swap_request = SwapRequest.objects.all()[0]
        context = Context(dict(swap_request=swap_request))
        kwargs['email_rendered'] = template.render(context)
        return super(EmailPreview, self).get_context_data(**kwargs)


@admin.register(EmailSchedule)
class EmailScheduleAdmin(admin.ModelAdmin):
    list_display = ('subject', 'template_name', 'email', 'send_at', 'sent', 'cancelled',
                    'swap_request')
    list_filter = ('sent', 'cancelled')
    search_fields = ('subject', 'email')

    def get_queryset(self, request):
        return super(EmailScheduleAdmin, self).get_queryset(request)\
                                              .select_related('swap_request',
                                                              'swap_request__requester',
                                                              'swap_request__requested',
                                                              'swap_request__requester_game',
                                                              'swap_request__requested_game',
                                                          'swap_request__requester_game__platform',
                                                          'swap_request__requested_game__platform')
