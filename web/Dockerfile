FROM python:3.5.2

MAINTAINER rogerhil

# Install required packages and remove the apt packages cache when done.

ENV CC=gcc

RUN curl -sL https://deb.nodesource.com/setup_6.x > node-setup.sh
RUN sed 's/deb https:/deb http:/g' node-setup.sh > node-setup.sh.modified
RUN sed 's/deb-src https:/deb-src http:/g' node-setup.sh.modified > node-setup.sh
RUN sh node-setup.sh

RUN echo 'deb http://ftp.debian.org/debian jessie-backports main' >> /etc/apt/sources.list

RUN apt-get update && apt-get install -y \
    vim \
	git \
	nginx \
    python-gdal \
	supervisor \
	memcached \
	apache2-utils \
	sudo \
	nodejs \
	ruby-full \
	net-tools \
	dnsutils \
	cron \
  && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y certbot -t jessie-backports && rm -rf /var/lib/apt/lists/*

RUN npm install -g gulp
RUN npm install -g bower
RUN gem install --no-rdoc --no-ri sass
RUN gem install --no-rdoc --no-ri compass

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

COPY lsg/requirements.txt /app/
RUN pip install -r /app/requirements.txt

# add unprivileged lsg
RUN groupadd lsg && useradd --create-home --home-dir /home/lsg -g lsg lsg
RUN chown -R lsg:lsg /app

# add (the rest of) our code
RUN sudo -u lsg mkdir -p /home/lsg/.ssh/
RUN sudo -u lsg ssh-keyscan bitbucket.org > /home/lsg/.ssh/known_hosts
COPY id_rsa /home/lsg/.ssh/
COPY id_rsa.pub /home/lsg/.ssh/
RUN chown -R lsg:lsg /home/lsg/.ssh/
RUN chown -R lsg:lsg /var/log/

RUN sudo -u lsg chmod 400 /home/lsg/.ssh/id_rsa
RUN sudo -u lsg git config --global user.email "support@letswapgames.com"
RUN sudo -u lsg git config --global user.name "Let'SwapGames Support"

COPY uwsgi_params /app
COPY uwsgi.ini /app

# apply patches
COPY lsg/patches/actstream/urls.py /usr/local/lib/python3.5/site-packages/actstream/
COPY lsg/patches/djcelery/backends/cache.py /usr/local/lib/python3.5/site-packages/djcelery/backends/
COPY lsg/patches/pg_fts/fields.py /usr/local/lib/python3.5/site-packages/pg_fts/
COPY lsg/patches/pg_fts/migrations.py /usr/local/lib/python3.5/site-packages/pg_fts/

COPY letsencrypt.tar.gz /

COPY crontab-root /var/spool/cron/crontabs/root
RUN chown root:crontab /var/spool/cron/crontabs/root
RUN chmod 600 /var/spool/cron/crontabs/root

RUN tar zxf letsencrypt.tar.gz
#RUN certbot certonly --text --webroot -w /app -d letswapgames.com -d www.letswapgames.com -d www.letswapgames.co.uk -d letswapgames.co.uk

COPY entrypoint.sh /

ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 80 443
CMD ["run"]
