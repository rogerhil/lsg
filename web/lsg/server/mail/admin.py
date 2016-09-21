from django.views.generic import TemplateView
from django.template.loader import get_template
from django.template import Context

from request.models import SwapRequest


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
