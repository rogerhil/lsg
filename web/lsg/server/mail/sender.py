from django.conf import settings
from django.contrib.sites.models import Site
from django.template.loader import get_template
from django.template import Context
from django.core.mail import EmailMultiAlternatives

from mail.models import EmailSchedule


class MailBuilder(object):

    @staticmethod
    def swap_requested(swap_request):
        subject = 'Game swap requested: "%(game1)s" X "%(game2)s"'
        emails = [swap_request.requested.email]
        context = dict(swap_request=swap_request, game1=swap_request.requester_game,
                       game2=swap_request.requested_game, user=swap_request.requested)
        return Sender(subject, 'swap-requested-to-requested', context, emails)

    @staticmethod
    def swap_accepted(swap_request):
        subject = 'Game swap accepted: "%(game1)s" X "%(game2)s"'
        emails = [swap_request.requested.email]
        context = dict(swap_request=swap_request, game1=swap_request.requester_game,
                       game2=swap_request.requested_game, user=swap_request.requested)
        email1 = Sender(subject, 'swap-accepted-to-requested', context, emails)
        emails = [swap_request.requester.email]
        context = dict(swap_request=swap_request, game1=swap_request.requested_game,
                       game2=swap_request.requester_game, user=swap_request.requester)
        email2 = Sender(subject, 'swap-accepted-to-requester', context, emails)
        return SenderGroup(email1, email2)

    @staticmethod
    def swap_refused(swap_request):
        subject = 'Game swap refused: "%(game1)s" X "%(game2)s"'
        emails = [swap_request.requester.email]
        context = dict(swap_request=swap_request, game1=swap_request.requested_game,
                       game2=swap_request.requester_game, user=swap_request.requester)
        return Sender(subject, 'swap-refused-to-requester', context, emails)

    @staticmethod
    def swap_cancelled(swap_request):
        subject = 'Game swap cancelled: "%(game1)s" X "%(game2)s"'
        emails = [swap_request.requested.email]
        context = dict(swap_request=swap_request, game1=swap_request.requester_game,
                       game2=swap_request.requested_game, user=swap_request.requested)
        return Sender(subject, 'swap-cancelled-to-requested', context, emails)

    @staticmethod
    def swap_finalized_first(swap_request, user_who_finalized, swapped):
        subject = 'Game swap finalized: "%(game1)s" X "%(game2)s'
        if user_who_finalized == swap_request.requester:
            user = swap_request.requested
            user_game = game2 = swap_request.requested_game
            user_who_finalized_game = game1 = swap_request.requester_game
        else:
            user = swap_request.requester
            user_game = game2 = swap_request.requester_game
            user_who_finalized_game = game1 = swap_request.requested_game
        emails = [user.email]
        context = dict(swap_request=swap_request, user=user, game1=game1, game2=game2,
                       user_game=user_game, swapped=swapped,
                       user_who_finalized=user_who_finalized,
                       user_who_finalized_game=user_who_finalized_game)
        return Sender(subject, 'swap-finalized-first', context, emails)

    @staticmethod
    def swap_expire_notification(swap_request, days):
        subject = 'Request expiring in %(days)s days: "%(game1)s" X "%(game2)s'
        user = swap_request.requester
        other_user = swap_request.requested
        emails = [user.email]
        game1 = swap_request.requested_game
        game2 = swap_request.requester_game
        context = dict(swap_request=swap_request, user=user, other_user=other_user, days=days,
                       game1=game1, game2=game2)
        sender1 = Sender(subject, 'swap-expire-notification', context, emails)
        user = swap_request.requested
        other_user = swap_request.requester
        emails = [user.email]
        game1 = swap_request.requester_game
        game2 = swap_request.requested_game
        context = dict(swap_request=swap_request, user=user, other_user=other_user, days=days,
                       game1=game1, game2=game2)
        sender2 = Sender(subject, 'swap-expire-notification', context, emails)
        return SenderGroup(sender1, sender2)


class Sender(object):

    def __init__(self, subject, template_name, context, emails,
                 from_email=settings.DEFAULT_FROM_EMAIL, html=True):
        self.subject = subject
        self.template_name = template_name
        self.context = context
        self.emails = [emails] if isinstance(emails, str) else emails
        self.from_email = from_email
        self.html = html

    def _render(self, prod=False):
        subject = self.subject % self.context
        template = get_template('mail/emails/%s.html' % self.template_name)
        if settings.DEBUG and not prod:
            site = Site.objects.get(domain='lsg.com')
            protocol = 'http'
        else:
            site = Site.objects.get(domain='www.letswapgames.com')
            protocol = 'https'
        website = "%s://%s" % (protocol, site.domain)
        base_context = {'site': site, 'website': website}
        base_context.update(self.context)
        context = Context(base_context)
        return subject, template.render(context)

    def send(self, force_to=None, prod=False):
        subject, body = self._render(prod)
        from_email = self.from_email
        if settings.MOCK_SEND_EMAIL and not force_to:
            print
            print("#" * 80)
            print("Email to: %s" % ', '.join(self.emails))
            print("Email suject: %s" % subject)
            print("-" * 80)
            print(body)
            print("#" * 80)
            print
        else:
            emails = self.emails
            if settings.FAKE_ALL_EMAILS_TO:
                emails = settings.FAKE_ALL_EMAILS_TO
            if force_to:
                emails = [force_to]
            msg = EmailMultiAlternatives(subject, body, from_email, emails)
            if self.html:
                msg.attach_alternative(body, 'text/html')
            msg.send()

    def schedule(self, send_at):
        serialized = EmailSchedule.serialize_context(self.context)
        EmailSchedule.objects.create(
            subject=self.subject,
            template_name=self.template_name,
            email=self.emails[0],
            send_at=send_at,
            swap_request=self.context.get('swap_request'),
            context_json=serialized
        )


class SenderGroup(object):

    def __init__(self, *senders):
        self.senders = senders

    def send(self, force_to=None):
        for sender in self.senders:
            sender.send(force_to)

    def schedule(self, send_at):
        for sender in self.senders:
            sender.schedule(send_at)
