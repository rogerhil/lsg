from django.core.management.base import BaseCommand
from users.models import User


class Command(BaseCommand):
    help = 'Mark all users as "app_updates" to make them reload the browser'

    def add_arguments(self, parser):
        parser.add_argument('--revert', default=False, action='store_true', dest='revert')

    def handle(self, *args, **options):
        count = User.objects.filter(deleted=False).update(app_updates=not options['revert'])
        verb = "UNMARKED" if options['revert'] else "marked"
        self.stdout.write(self.style.SUCCESS('%s users %s as "app_updates".' % (count, verb)))
