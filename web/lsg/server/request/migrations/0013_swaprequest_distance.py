# -*- coding: utf-8 -*-
# Generated by Django 1.10 on 2016-08-21 19:39
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('request', '0012_swaprequest_automatically_refused'),
    ]

    operations = [
        migrations.AddField(
            model_name='swaprequest',
            name='distance',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
            preserve_default=False,
        ),
    ]
