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
	memcached \
	apache2-utils \
  && rm -rf /var/lib/apt/lists/*

RUN echo python --version

RUN easy_install pip

RUN pip install pip --upgrade

# install uwsgi now because it takes a little while
RUN pip install uwsgi

# setup all the configfiles
RUN echo "daemon off;" >> /etc/nginx/nginx.conf
COPY nginx-app.conf /etc/nginx/sites-available/default
COPY supervisor-app.conf /etc/supervisor/conf.d/
COPY supervisord.conf /etc/supervisor/

RUN htpasswd -bc /etc/nginx/.htpasswd lsg Identificad0

# COPY requirements.txt and RUN pip install BEFORE adding the rest of your code, this will cause Docker's caching mechanism
# to prevent re-installinig (all your) dependencies when you made a change a line or two in your app. 

# add (the rest of) our code
#COPY lsg/ /app/lsg/
RUN mkdir -p /root/.ssh/
RUN ssh-keyscan bitbucket.org > ~/.ssh/known_hosts
COPY id_rsa /root/.ssh/
COPY id_rsa.pub /root/.ssh/
RUN chmod 400 /root/.ssh/id_rsa
RUN git config --global user.email "support@letswapgames.com"
RUN git config --global user.name "Let'SwapGames Support"
#RUN git clone git@bitbucket.org:rogerhil/lsg-docker.git /app/lsg-docker

COPY lsg/requirements.txt /app/
RUN pip install -r /app/requirements.txt

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
