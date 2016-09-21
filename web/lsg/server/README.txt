
 * Start celery
celery -A config worker -l info

 * start celery beat
python manage.py celery beat

 * start rabbitmq
sudo rabbitmq-server
OR
sudo service rabbitmq-server start   # as a service
