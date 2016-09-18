FROM postgres:latest

MAINTAINER rogerhil


RUN apt-get update && apt-get install -y \
	postgresql-9.5-postgis-2.2 \
  && rm -rf /var/lib/apt/lists/*

EXPOSE 5432
CMD ["postgres"]
