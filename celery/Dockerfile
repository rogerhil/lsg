FROM lsgdocker_web:latest

MAINTAINER rogerhil

RUN rm /etc/supervisor/conf.d/*

COPY celerybeat.conf /etc/supervisor/conf.d/
COPY celeryd.conf /etc/supervisor/conf.d/
COPY supervisord.conf /etc/supervisor/

COPY entrypoint.sh /

ENTRYPOINT ["/entrypoint.sh"]

CMD ["run"]

