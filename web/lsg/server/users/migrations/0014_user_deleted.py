# -*- coding: utf-8 -*-
# Generated by Django 1.10.3 on 2016-11-11 13:14
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0013_auto_20161007_1548'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='deleted',
            field=models.BooleanField(default=False),
        ),
    ]