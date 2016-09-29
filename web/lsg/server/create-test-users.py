import os
import sys
import django

BASE_PATH = os.path.abspath(os.path.dirname(__file__))


def create_test_user(name):
    from users.models import User
    user = User.objects.get_or_create(username=name, email='%s@lsgtest.com' % name)[0]
    user.is_staff = True
    user.set_password(name)
    user.save()


def run(names):
    names = [i.strip() for i in names.split(',') if i.strip()]
    for name in names:
        create_test_user(name)


if __name__ == '__main__':
    sys.path.append(os.path.abspath(os.path.join(BASE_PATH, '..')))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    django.setup()
    run(sys.argv[1])
