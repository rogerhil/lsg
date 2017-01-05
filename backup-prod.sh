#!/bin/bash

# Backup script based on: https://docs.docker.com/engine/tutorials/dockervolumes/#/backup-restore-or-migrate-data-volumes
# To restore the backup just do the following:
# 1. CREATE NEW CONTAINER:
#    $ docker run -v /dbdata --name dbstore2 ubuntu /bin/bash
# 2. UN-TAR THE BACKUP:
#    $ docker run --rm --volumes-from dbstore2 -v $(pwd):/backup ubuntu bash -c "cd /dbdata && tar xvf /backup/backup.tar --strip 1"
#
# REAL EXAMPLE TESTED LOCALLY (PS: had to move backup tar.gz file from the timestamp directory one level below):
# RESTORE DATA:
# 1. IMPORTANT!!!: stop postgres: $  docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml stop postgres
# 2. docker run --rm --volumes-from lsgdocker_postgres_1 -v $(pwd)/backup-files/dev:/backup-files lsgdocker_postgres bash -c "ls -lh /var/lib/postgresql/data/; du -sh /var/lib/postgresql/data/; rm -rf /var/lib/postgresql/data/*; tar zxf /backup-files/data-backup.tar.gz; ls -lh /var/lib/postgresql/data/; du -sh /var/lib/postgresql/data/;"
#
# RESTORE MEDIA:
# docker run --rm --volumes-from lsgdocker_web_1 -v $(pwd)/backup-files/dev:/backup-files lsgdocker_web bash -c "ls -lh /app/media; du -sh /app/media; tar zxf /backup-files/media-backup.tar.gz; ls -lh /app/media; du -sh /app/media;"
#

PREFIX='prod'
LOCAL_MOUNT='/root/lsg-mount-backup/'

echo
echo "** Running backup for $PREFIX"
echo

TIMESTAMP_DIR="$(date +'%Y-%m-%dT%H:%M')"
BACKUP_DIR_BASE="/root/backup-files/$PREFIX/"
BACKUP_DIR="$BACKUP_DIR_BASE$TIMESTAMP_DIR"
mkdir -p $BACKUP_DIR

echo Saving postgres data
docker run --rm --volumes-from lsgdocker_postgres_1 -v $LOCAL_MOUNT:/data-backup alpine tar cfz /data-backup/data-backup.tar.gz /var/lib/postgresql/data

echo
echo Saving media data
docker run --rm --volumes-from lsgdocker_media_1 -v $LOCAL_MOUNT:/media-backup alpine tar cfz /media-backup/media-backup.tar.gz /app/media

echo
echo Saving logs
docker run --rm --volumes-from lsgdocker_web_1 -v $LOCAL_MOUNT:/logs-backup alpine tar cfz /logs-backup/logs-backup.tar.gz /app/logs

mv $LOCAL_MOUNT/data-backup.tar.gz $BACKUP_DIR/
mv $LOCAL_MOUNT/media-backup.tar.gz $BACKUP_DIR/
mv $LOCAL_MOUNT/logs-backup.tar.gz $BACKUP_DIR/

echo
echo Copying to S3
aws s3 cp --region=eu-west-1 --recursive $BACKUP_DIR s3://letswapgames-backup-$PREFIX/$TIMESTAMP_DIR

echo
echo '========================================================================'
ls -lh $BACKUP_DIR

echo
echo ............. AWS S3 letswapgames-backup-$PREFIX/$TIMESTAMP_DIR
aws s3 ls --region=eu-west-1 s3://letswapgames-backup-$PREFIX/$TIMESTAMP_DIR/

echo
echo Backup files saved at $BACKUP_DIR and S3 bucket letswapgames-backup-$PREFIX/$TIMESTAMP_DIR/
echo

echo
echo Removing old local backups

OLD_LOCAL_BACKUPS=`ls $BACKUP_DIR_BASE  | sort | head -n -3`

for SUB_DIR in $OLD_LOCAL_BACKUPS
do
    echo "Running: rm -rf $BACKUP_DIR_BASE$SUB_DIR"
    rm -rf $BACKUP_DIR_BASE$SUB_DIR
done

echo
echo Removing old S3 backups

OLD_S3_BACKUPS=`aws s3 ls letswapgames-backup-prod | sort | head -n -3 | awk '{ print $2 }'`
for SUB_DIR in $OLD_S3_BACKUPS
do
    echo "Running: aws s3 rm --recursive s3://letswapgames-backup-prod/$SUB_DIR"
    aws s3 rm s3://letswapgames-backup-prod/$SUB_DIR
done

echo
echo Current backups:
aws s3 ls --region=eu-west-1 s3://letswapgames-backup-$PREFIX
echo
echo Finished.
