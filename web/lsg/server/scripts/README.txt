$ sudo rabbitmqctl add_user rogerhil alabama
$ sudo rabbitmqctl add_vhost localhost
$ sudo rabbitmqctl set_permissions -p localhost rogerhil ".*" ".*" ".*"
