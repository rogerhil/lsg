#!/bin/bash

set -e

if [ "${1:0:1}" = '-' ]; then
	set -- run "$@"
fi

chown -R lsg:lsg /app

if [ "$1" = 'run' ]; then
    supervisord -n

elif [ "$1" = 'init' ]; then
    cd /app/lsg/server
    echo Migrating database
    python manage.py migrate
    echo Loading WorldBorder database
    python world/load.py
    echo Creating Django Sites
    if [ -n "$2" ]; then
       python create-site.py $2
    else
       python create-site.py
    fi
    if [ "$LSG_DJANGO_DEBUG" = 'true' ]; then
        echo Debug mode        
    else
        echo Collecting static files
        python manage.py collectstatic --no-input
    fi
    
elif [ "$1" = 'update' ]; then
    cd /app/lsg/server
    python manage.py migrate
    python manage.py collectstatic

elif [ "$1" = 'createsuperuser' ]; then
    cd /app/lsg/server
    python manage.py createsuperuser

elif [ "$1" = 'devrun' ]; then
    cd /app/lsg/server
    python manage.py runserver 0.0.0.0:80

elif [ "$1" = 'shell' ]; then
    cd /app/lsg/server
    python manage.py shell

elif [ "$1" = 'dbshell' ]; then
    cd /app/lsg/server
    python manage.py shell

elif [ "$1" = 'bash' ]; then
    bash

else
    exec "$@"
fi

