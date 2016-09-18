FROM lsg_web:latest

MAINTAINER rogerhil

RUN rm /etc/supervisor/conf.d/*

COPY celerybeat.conf /etc/supervisor/conf.d/
COPY celeryd.conf /etc/supervisor/conf.d/
COPY supervisord.conf /etc/supervisor/conf.d/

RUN mkdir /var/log/supervisord/
RUN mkdir /var/log/celery/ 

COPY entrypoint.sh /

ENTRYPOINT ["/entrypoint.sh"]

CMD ["run"]

