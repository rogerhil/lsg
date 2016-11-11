from django.utils import timezone

from scripts.base import BaseScript

from users.models import User
from mail.models import EmailSchedule
from mail.sender import Sender


class SendScheduledEmails(BaseScript):
    name = 'send_scheduled_emails'

    def main(self):
        now = timezone.now()
        deleted = [u.email for u in User.objects.filter(deleted=True)]
        schedules = EmailSchedule.objects.filter(send_at__lte=now, sent=False,
                                                 cancelled=False)\
                                         .exclude(email__in=deleted)
        self.logger.info('Sending %s emails.' % schedules.count())
        for schedule in schedules:
            self.logger.debug('Sending email: %s' % schedule)
            sender = Sender(schedule.subject, schedule.template_name,
                            schedule.context, schedule.email)
            sender.send()
            schedule.sent = True
            schedule.save()


if __name__ == '__main__':
    script = SendScheduledEmails()
    script.run_from_cli()
