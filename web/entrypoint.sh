#!/bin/bash

set -e

if [ "${1:0:1}" = '-' ]; then
	set -- run "$@"
fi

if [ ! -d /app/lsg-docker/.git ]; then
    git clone git@bitbucket.org:rogerhil/lsg-docker.git /app/lsg-docker
fi

chown -R lsg:lsg /app

ls /app/lsg-docker/.git

if [ "$1" = 'run' ]; then
    supervisord -n

elif [ "$1" = 'init' ]; then
    cd /app/lsg-docker/web/lsg/server
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

elif [ "$1" = 'pull' ]; then
    cd /app/lsg-docker/web/lsg/server
    git pull origin master

elif [ "$1" = 'update' ]; then
    cd /app/lsg-docker/web/lsg/server
    sudo -u lsg -E HOME=/home/lsg/ git pull origin master
    sudo -u lsg -E HOME=/home/lsg/ python manage.py migrate
    cd /app/lsg-docker/web/lsg/client/master
    sudo -u lsg -E HOME=/home/lsg/ npm install
    sudo -u lsg -E HOME=/home/lsg/ bower install
    sudo -u lsg -E HOME=/home/lsg/ gulp build --usesass
    cd /app/lsg-docker/web/lsg/server
    sudo -u lsg -E HOME=/home/lsg/ python manage.py collectstatic --no-input

elif [ "$1" = 'createtestusers' ]; then
    cd /app/lsg-docker/web/lsg/server
    python create-test-users.py $2

elif [ "$1" = 'createsuperuser' ]; then
    cd /app/lsg-docker/web/lsg/server
    python manage.py createsuperuser

elif [ "$1" = 'devrun' ]; then
    cd /app/lsg-docker/web/lsg/server
    python manage.py runserver 0.0.0.0:80

elif [ "$1" = 'shell' ]; then
    cd /app/lsg-docker/web/lsg/server
    python manage.py shell

elif [ "$1" = 'dbshell' ]; then
    cd /app/lsg-docker/web/lsg/server
    python manage.py dbshell

elif [ "$1" = 'migrate' ]; then
    cd /app/lsg-docker/web/lsg/server
    python manage.py migrate

elif [ "$1" = 'makemigrations' ]; then
    cd /app/lsg-docker/web/lsg/server
    python manage.py makemigrations

elif [ "$1" = 'bash' ]; then
    bash

else
    exec "$@"
fi
