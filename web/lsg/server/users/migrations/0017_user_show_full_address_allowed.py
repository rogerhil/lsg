# -*- coding: utf-8 -*-
# Generated by Django 1.10.3 on 2016-12-05 11:50
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0016_user_distance_unit'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='show_full_address_allowed',
            field=models.BooleanField(default=True),
        ),
    ]