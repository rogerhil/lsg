FROM python:3.5.2

MAINTAINER rogerhil

# Install required packages and remove the apt packages cache when done.

ENV CC=gcc

RUN apt-get update && apt-get install -y \
        vim \
	git \
	nginx \
        python-gdal \
	supervisor \
  && rm -rf /var/lib/apt/lists/*

RUN echo python --version

RUN easy_install pip

# install uwsgi now because it takes a little while
RUN pip install uwsgi

# setup all the configfiles
RUN echo "daemon off;" >> /etc/nginx/nginx.conf
COPY nginx-app.conf /etc/nginx/sites-available/default
COPY supervisor-app.conf /etc/supervisor/conf.d/
COPY supervisord.conf /etc/supervisor/

# COPY requirements.txt and RUN pip install BEFORE adding the rest of your code, this will cause Docker's caching mechanism
# to prevent re-installinig (all your) dependencies when you made a change a line or two in your app. 

RUN mkdir -p /app/lsg
COPY lsg/requirements.txt /app/lsg

RUN pip install -r /app/lsg/requirements.txt

# add (the rest of) our code
COPY lsg/ /app/lsg/

COPY uwsgi_params /app
COPY uwsgi.ini /app

# apply patches
COPY lsg/patches/actstream/urls.py /usr/local/lib/python3.5/site-packages/actstream/
COPY lsg/patches/djcelery/backends/cache.py /usr/local/lib/python3.5/site-packages/djcelery/backends/
COPY lsg/patches/pg_fts/fields.py /usr/local/lib/python3.5/site-packages/pg_fts/
COPY lsg/patches/pg_fts/migrations.py /usr/local/lib/python3.5/site-packages/pg_fts/

# add unprivileged lsg
RUN groupadd lsg && useradd --create-home --home-dir /home/lsg -g lsg lsg
RUN chown -R lsg:lsg /app

COPY entrypoint.sh /

ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 80
CMD ["run"]

