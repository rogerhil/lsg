FROM postgres:9.5

MAINTAINER rogerhil


RUN apt-get update && apt-get install -y \
	postgresql-9.5-postgis-2.2 \
  && rm -rf /var/lib/apt/lists/*

RUN pwd

COPY docker-entrypoint-initdb.d/setup-db.sh /docker-entrypoint-initdb.d/

RUN ls /docker-entrypoint-initdb.d/

EXPOSE 5432

CMD ["postgres"]
