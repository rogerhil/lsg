from django.conf import settings
from django.contrib.sites.models import Site
from django.template.loader import get_template
from django.template import Context
from django.core.urlresolvers import reverse
from django.views.generic import TemplateView, RedirectView

from request.models import SwapRequest
from mail.sender import MailBuilder


class SwapRequestEmailPreview(TemplateView):
    template_name = 'mail/swap-request.preview.html'

    def get_context_data(self, **kwargs):
        template_name = kwargs['template_name']
        template = get_template("mail/emails/%s.html" % template_name)
        rid = self.request.GET.get('id')
        if rid:
            swap_request = SwapRequest.objects.get(pk=rid)
        else:
            requests = SwapRequest.objects.all()
            swap_request = requests[0] if requests.count() else None
        if settings.DEBUG:
            site = Site.objects.get(domain='lsg.com')
        else:
            site = Site.objects.get(domain='www.letswapgames.com')
        user = swap_request.requester
        user_who_finalized = other_user = swap_request.requested
        if template_name.endswith('requested'):
            user = swap_request.requested
            user_who_finalized = other_user = swap_request.requester
        context = Context(dict(swap_request=swap_request, site=site, user=user,
                               user_who_finalized=user_who_finalized, days=3,
                               other_user=other_user))
        kwargs['email_rendered'] = template.render(context)
        return super(SwapRequestEmailPreview, self).get_context_data(**kwargs)


class SwapRequestEmailSendTest(RedirectView):

    def get_redirect_url(self, *args, **kwargs):
        tname = kwargs['template_name']
        self.url = reverse('swap_request_email_preview', kwargs=dict(template_name=tname))
        rid = self.request.GET.get('id')
        if rid:
            swap_request = SwapRequest.objects.get(pk=rid)
        else:
            requests = SwapRequest.objects.all()
            swap_request = requests[0] if requests.count() else None
        sender = None
        if tname == 'swap-accepted-to-requested' or tname == 'swap-accepted-to-requester':
            sender = MailBuilder.swap_accepted(swap_request)
        elif tname == 'swap-cancelled-to-requested':
            sender = MailBuilder.swap_cancelled(swap_request)
        elif tname == 'swap-expired-notification':
            sender = MailBuilder.swap_expire_notification(swap_request)
        elif tname == 'swap-finalized-first':
            sender = MailBuilder.swap_finalized_first(swap_request)
        elif tname == 'swap-refused-to-requester':
            sender = MailBuilder.swap_refused(swap_request)
        elif tname == 'swap-requested-to-requested':
            sender = MailBuilder.swap_refused(swap_request)

        if sender:
            sender.send('rogerhil@gmail.com', True)
        return super(SwapRequestEmailSendTest, self).get_redirect_url(*args, **kwargs)
