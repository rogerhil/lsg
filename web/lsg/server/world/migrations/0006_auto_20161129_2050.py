# -*- coding: utf-8 -*-
# Generated by Django 1.10.3 on 2016-11-29 20:50
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('world', '0005_address_country'),
    ]

    operations = [
        migrations.AlterField(
            model_name='address',
            name='city',
            field=models.CharField(blank=True, max_length=128, null=True),
        ),
    ]
