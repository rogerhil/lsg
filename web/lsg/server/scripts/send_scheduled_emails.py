from datetime import datetime

from scripts.base import BaseScript

from mail.models import EmailSchedule
from mail.sender import Sender


class SendScheduledEmails(BaseScript):
    name = 'send_scheduled_emails'

    def main(self):
        now = datetime.now()
        schedules = EmailSchedule.objects.filter(send_at__lte=now, sent=False,
                                                 cancelled=False)
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
