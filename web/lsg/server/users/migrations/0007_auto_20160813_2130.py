# -*- coding: utf-8 -*-
# Generated by Django 1.10 on 2016-08-13 21:30
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_auto_20160813_2129'),
    ]

    operations = [
        migrations.AlterField(
            model_name='collectionitem',
            name='weight',
            field=models.PositiveSmallIntegerField(blank=True, choices=[(1, 'Easily'), (3, 'Hardly'), (2, 'Maybe')], default=3),
        ),
    ]
