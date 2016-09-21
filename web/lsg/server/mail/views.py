from django.template.loader import get_template
from django.template import Context
from django.views.generic import TemplateView

from request.models import SwapRequest


class SwapRequestEmailPreview(TemplateView):
    template_name = 'mail/swap-request.preview.html'

    def get_context_data(self, **kwargs):
        template = get_template("mail/emails/%s.html" %
                                kwargs['template_name'])
        rid = self.request.GET.get('id')
        if rid:
            swap_request = SwapRequest.objects.get(pk=rid)
        else:
            requests = SwapRequest.objects.all()
            swap_request = requests[0] if requests.count() else None
        context = Context(dict(swap_request=swap_request))
        kwargs['email_rendered'] = template.render(context)
        return super(SwapRequestEmailPreview, self).get_context_data(**kwargs)
