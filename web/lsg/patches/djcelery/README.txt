# djcelery issues with newer versions of Django

Discussion: https://github.com/celery/django-celery/issues/411

* Patch from
https://anonscm.debian.org/cgit/python-modules/packages/django-celery.git/plain/debian/patches/0006-Fix-caching-with-Django-1.9.patch

* Instructions
cd <lsgenv>/lib/python3.5/site-packages/
git apply --stat <PROJECT_DIR>/patches/djcelery/fix-get-model-with-django.patch
git apply --check <PROJECT_DIR>/patches/djcelery/fix-get-model-with-django.patch
git apply <PROJECT_DIR>/patches/djcelery/fix-get-model-with-django.patch

* How to apply patches
https://ariejan.net/2009/10/26/how-to-create-and-apply-a-patch-with-git/)

