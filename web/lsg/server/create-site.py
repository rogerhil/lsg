import os
import sys
import django

BASE_PATH = os.path.abspath(os.path.dirname(__file__))


def create_django_site(domain):
    from django.contrib.sites.models import Site
    created = Site.objects.get_or_create(name=domain, domain=domain)[1]
    print("Django Site %s created." % domain if created else
          "Django Site %s already exists." % domain)


def run():
    from django.conf import settings
    domains = sys.argv[-1].strip()
    if domains != 'create-site.py':
        for domain in domains.split(','):
            create_django_site(domain)
    for host in settings.ALLOWED_HOSTS:
        if host in ['localhost', '127.0.0.1']:
            continue
        create_django_site(host)


if __name__ == '__main__':
    sys.path.append(os.path.abspath(os.path.join(BASE_PATH, '..')))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    django.setup()
    run()
