# -*- coding: utf-8 -*-
# Generated by Django 1.10.3 on 2016-12-05 13:54
from __future__ import unicode_literals

import django.contrib.gis.db.models.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('world', '0006_auto_20161129_2050'),
    ]

    operations = [
        migrations.AddField(
            model_name='address',
            name='city_point',
            field=django.contrib.gis.db.models.fields.PointField(blank=True, null=True, srid=4326),
        ),
    ]