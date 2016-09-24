import os


def bool_env(name):
    return os.getenv(name, '').lower().strip() == 'true'


if os.getenv('LSG_DB_NAME'):
    DATABASES = {
        'default': {
            'ENGINE': 'custompostgis',
            'NAME': os.getenv('LSG_DB_NAME'),
            'USER': os.getenv('LSG_DB_USER'),
            'PASSWORD': os.getenv('LSG_DB_PASS'),
            'HOST': os.getenv('LSG_DB_HOST'),
            'PORT': os.getenv('LSG_DB_PORT'),
        }
    }
    
    POSTGIS_TEMPLATE = 'letswapgames'
    
    DEBUG = bool_env('LSG_DJANGO_DEBUG')

    ALLOWED_HOSTS = ['letswapgames.com', 'letswapgames.ie', 'letswapgames.co.uk',
                     'www.letswapgames.com', 'www.letswapgames.ie', 'www.letswapgames.co.uk']

    for host in os.getenv('LSG_ALLOWED_HOSTS', '').split(','):
        if host.strip():
            ALLOWED_HOSTS.append(host)

    LOGS_BASE = '/app/logs/'

    LOGGING = {
        'version': 1,
        'disable_existing_loggers': True,
        'filters': {
            'require_debug_false': {
                '()': 'django.utils.log.RequireDebugFalse',
            },
            'require_debug_true': {
                '()': 'django.utils.log.RequireDebugTrue',
            },
        },
        'formatters': {
            'simple': {
                'format': '[%(asctime)s] %(levelname)s %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'verbose': {
                'format': '[%(asctime)s] %(levelname)s [%(name)s.%(funcName)s:%(lineno)d] %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
        },
        'handlers': {
            'console': {
                'level': 'DEBUG',
                'filters': ['require_debug_true'],
                'class': 'logging.StreamHandler',
                'formatter': 'simple'
            },
            'development_logfile': {
                'level': 'DEBUG',
                'filters': ['require_debug_true'],
                'class': 'logging.FileHandler',
                'filename': os.path.join(LOGS_BASE, 'web/dev.log'),
                'formatter': 'verbose'
            },
            'production_logfile': {
                'level': 'ERROR',
                'filters': ['require_debug_false'],
                'class': 'logging.FileHandler',
                'filename': os.path.join(LOGS_BASE, 'web/prod.log'),
                'formatter': 'simple'
            },
            'dba_logfile': {
                'level': 'DEBUG',
                'filters': ['require_debug_false', 'require_debug_true'],
                'class': 'logging.FileHandler',
                'filename': os.path.join(LOGS_BASE, 'web/dba.log'),
                'formatter': 'simple'
            },
        },
        'loggers': {
            'coffeehouse': {
                'handlers': ['console', 'development_logfile', 'production_logfile'],
            },
            'dba': {
                'handlers': ['console', 'dba_logfile'],
            },
            'django': {
                'handlers': ['console', 'development_logfile', 'production_logfile'],
            },
            'py.warnings': {
                'handlers': ['console', 'development_logfile'],
            },
        }
    }

    SCRIPTS_LOGS_DIR = os.path.join(LOGS_BASE, 'scripts/')

    SCRIPTS_XML_DIR = '/app/media/scripts/xml/'

    GAMES_IMAGES_PARENT_DIR = '/app'

    GAMES_IMAGES_DIR = '/app/media/img/games/'

    # FACEBOOK
    SOCIAL_AUTH_FACEBOOK_KEY = os.getenv('LSG_AUTH_FACEBOOK_KEY')
    SOCIAL_AUTH_FACEBOOK_SECRET = os.getenv('LSG_AUTH_FACEBOOK_SECRET')

    # TWITTER
    SOCIAL_AUTH_TWITTER_KEY = os.getenv('LSG_AUTH_TWITTER_KEY')
    SOCIAL_AUTH_TWITTER_SECRET = os.getenv('LSG_AUTH_TWITTER_SECRET')

    # GOOGLE
    SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = os.getenv('LSG_AUTH_GOOGLE_KEY')
    SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = os.getenv('LSG_AUTH_GOOGLE_SECRET')

    EMAIL_USE_TLS = bool_env('LSG_EMAIL_USE_TLS')
    EMAIL_HOST = os.getenv('LSG_EMAIL_HOST')
    EMAIL_PORT = os.getenv('LSG_EMAIL_PORT')
    EMAIL_HOST_USER = os.getenv('LSG_EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = os.getenv('LSG_EMAIL_HOST_PASSWORD')
    DEFAULT_FROM_EMAIL = os.getenv('LSG_DEFAULT_FROM_EMAIL')
    DEFAULT_TO_EMAIL = os.getenv('LSG_DEFAULT_TO_EMAIL')
    SERVER_EMAIL = os.getenv('LSG_SERVER_EMAIL')

    MOCK_SEND_EMAIL = bool_env('LSG_MOCK_SEND_EMAIL')