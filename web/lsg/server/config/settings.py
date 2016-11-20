"""
Django settings for lsg project.

Generated by 'django-admin startproject' using Django 1.10.

For more information on this file, see
https://docs.djangoproject.com/en/1.10/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.10/ref/settings/
"""

import os

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.10/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'f_gz=d=lbd-6uv5k@th(xei1)&d9&uyo_^1&wbezq8i-)l8it7'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    'django.contrib.sites',
    'django.contrib.sitemaps',
    'debug_toolbar',
    'rest_framework',
    'social.apps.django_app.default',
    'admin_extra_urls',
    'kombu.transport.django',
    'rest_framework_cache',
    'djcelery',
    'actstream',
    'world',
    'games',
    'users',
    'request',
    'scripts',
    'mail'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'debug_toolbar.middleware.DebugToolbarMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.common.BrokenLinkEmailsMiddleware',
    'middleware.RedirectFallbackMiddleware'
]

ROOT_URLCONF = 'urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'social.apps.django_app.context_processors.backends',
                'social.apps.django_app.context_processors.login_redirect',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

#COUNTRIES_ONLY = ['GB', 'IE', 'IM']

SUPPORTED_COUNTRIES = ['GB', 'IE', 'IM']
COUNTRIES_FLAG_URL = 'img/flags/48x48/{code}.png'

# Database
# https://docs.djangoproject.com/en/1.10/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'lsg',
        'USER': 'rogerhil',
        'PASSWORD': 'rogerhil',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'LOCATION': '127.0.0.1:11211',
    }
}

# Password validation
# https://docs.djangoproject.com/en/1.10/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/1.10/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.10/howto/static-files/

STATIC_URL = '/static/'

STATIC_APP_URL = '/app/'

STATIC_ROOT = '/app/static'


STATIC_APP_ROOT = os.path.join(BASE_DIR, 'client/build/')

STATICFILES_DIRS = (
    os.path.join(BASE_DIR, 'client/'),
    os.path.join(BASE_DIR, 'static/'),
)

STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Media files

MEDIA_ROOT = '/app/media'

MEDIA_URL = '/media/'

# Auth

AUTH_USER_MODEL = 'users.User'


# Logging

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': '/var/log/lsg.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}

SCRIPTS_LOGS_DIR = os.path.join(BASE_DIR, 'server/scripts/logs')

SCRIPTS_XML_DIR = os.path.join(BASE_DIR, 'server/scripts/xml')

GAMES_IMAGES_PARENT_DIR = BASE_DIR

GAMES_IMAGES_DIR = os.path.join(BASE_DIR, 'media/img/games/')

# Geo IP

GEOIP_PATH = os.path.join(BASE_DIR, 'geoipdata')


# Email Settings

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_USE_TLS = True
EMAIL_HOST = ''
EMAIL_PORT = 587
EMAIL_HOST_USER = ''
EMAIL_HOST_PASSWORD = ''
DEFAULT_FROM_EMAIL = 'rogerhil@gmail.com'

ADMINS = (
    ('Rogerio Hilbert', 'letswapgames@gmail.com'),
    ('Rogerio Hilbert', 'rogerhil@gmail.com')
)

SERVER_EMAIL = 'rogerhil@gmail.com'

CONTACT_FORM_TO = ['rogerhil@gmail.com']

ADMINS = (
    ('Rogerio Hilbert', 'letswapgames@gmail.com'),
    ('Rogerio Hilbert', 'rogerhil@gmail.com')
)

#FAKE_ALL_EMAILS_TO = ['rogerhil@gmail.com']
FAKE_ALL_EMAILS_TO = []

MOCK_SEND_EMAIL = False


ACTSTREAM_SETTINGS = {
    #'MANAGER': 'myapp.managers.MyActionManager',
    'FETCH_RELATIONS': True,
    'USE_JSONFIELD': True
}

GOOGLE_GEOCODING_KEY = ''


###############################################################################
# START SOCIAL SETTINGS

AUTHENTICATION_BACKENDS = (
    'social.backends.facebook.FacebookOAuth2',
    'social.backends.google.GoogleOAuth2',
    #'social.backends.reddit.RedditOAuth2',
    'social.backends.twitter.TwitterOAuth',
    'django.contrib.auth.backends.ModelBackend',
)

SOCIAL_AUTH_RAISE_EXCEPTIONS = True
RAISE_EXCEPTIONS = True

LOGIN_URL = '/login/'
LOGIN_REDIRECT_URL = '/done/'
URL_PATH = ''
SOCIAL_AUTH_STRATEGY = 'social.strategies.django_strategy.DjangoStrategy'
SOCIAL_AUTH_STORAGE = 'social.apps.django_app.default.models.DjangoStorage'
#SOCIAL_AUTH_GOOGLE_OAUTH_SCOPE = [
#    'https://www.googleapis.com/auth/drive',
#    'https://www.googleapis.com/auth/userinfo.profile'
#]
# SOCIAL_AUTH_EMAIL_FORM_URL = '/signup-email'
SOCIAL_AUTH_EMAIL_FORM_HTML = 'email_signup.html'
#SOCIAL_AUTH_EMAIL_VALIDATION_FUNCTION = 'example.app.mail.send_validation'
#SOCIAL_AUTH_EMAIL_VALIDATION_FUNCTION = 'letswapgames.users.mail.send_validation'
SOCIAL_AUTH_EMAIL_VALIDATION_URL = '/email-sent/'
# SOCIAL_AUTH_USERNAME_FORM_URL = '/signup-username'
SOCIAL_AUTH_USERNAME_FORM_HTML = 'username_signup.html'

SOCIAL_AUTH_SLUGIFY_USERNAMES = True

SOCIAL_AUTH_PIPELINE = (
    'social.pipeline.social_auth.social_details',
    'social.pipeline.social_auth.social_uid',
    'social.pipeline.social_auth.auth_allowed',
    'social.pipeline.social_auth.social_user',
    'social.pipeline.user.get_username',
    'social.pipeline.social_auth.associate_by_email',  # ASSOCIATE EMAILS TO A SINGLE ACCOUNT (it could be unsafe: http://psa.matiasaguirre.net/docs/use_cases.html#associate-users-by-email)
    #'example.app.pipeline.require_email',
    'social.pipeline.mail.mail_validation',
    'social.pipeline.user.create_user',
    'social.pipeline.social_auth.associate_user',
    'social.pipeline.debug.debug',
    'social.pipeline.social_auth.load_extra_data',
    'social.pipeline.user.user_details',
    'social.pipeline.debug.debug',
    'users.pipeline.save_profile'

)

# FACEBOOK
SOCIAL_AUTH_FACEBOOK_PROFILE_EXTRA_PARAMS = {
  'locale': 'en_UK',
  'fields': 'id, name, first_name, last_name, gender, email, age_range,'
            'verified, location, picture, link, updated_time'
}
SOCIAL_AUTH_FACEBOOK_SCOPE = ['email', 'user_location']


# TWITTER
SOCIAL_AUTH_TWITTER_SCOPE = ['email']

# GOOGLE
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = [
    #'https://www.googleapis.com/auth/plus.login',
    #'https://www.googleapis.com/auth/plus.me',
    #'https://www.googleapis.com/auth/plus.circles.read'
    #'https://www.googleapis.com/auth/userinfo.email',
    #'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/plus.login',
    #'https://www.googleapis.com/auth/plus.me',
    #'https://www.googleapis.com/auth/plus.circles.read',
    #'https://www.googleapis.com/auth/plus.circles.write',
    #'https://www.googleapis.com/auth/plus.moments.write',
    #'https://www.googleapis.com/auth/plus.profile.agerange.read',
    #'https://www.googleapis.com/auth/plus.profile.language.read',
    #'https://www.googleapis.com/auth/plus.circles.members.read'
]
SOCIAL_AUTH_GOOGLE_PLUS_AUTH_EXTRA_ARGUMENTS = {
    'access_type': 'offline'
}


# END SOCIAL SETTINGS
###############################################################################

EXPIRE_OLD_ONGOING_REQUESTS_IN_DAYS = 30
NOTIFICATION_DAYS_BEFORE_EXPIRE = [7, 3, 2, 1]

SUPPORTED_PLATFORMS = [
    'Microsoft Xbox 360',
    'Microsoft Xbox One',
    'Nintendo 3DS',
    'Nintendo DS',
    'Nintendo Entertainment System (NES)',
    'Nintendo Wii',
    'Nintendo Wii U',
    'Sony Playstation 2',
    'Sony Playstation 3',
    'Sony Playstation 4',
    'Sony Playstation Vita',
    'Sony PSP',
    'Super Nintendo (SNES)'
]

from config.dockersettings import *

try:
    pass
    # disabling localsettings for while...
    #from config.localsettings import *
except ImportError:
    pass

