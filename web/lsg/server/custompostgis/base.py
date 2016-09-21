from django.contrib.gis.db.backends.postgis.base import *

class DatabaseWrapper(DatabaseWrapper):
    def prepare_database(self):
        """
        postgis.base.DatabaseWrapper is a sub of postgresql.base.DatabaseWrapper,
        which doesn't do anything in prepare_database, so we're just going to
        override the postgis version entirely to avoid the "CREATE EXTENSION"
        problem.
        """
        pass

