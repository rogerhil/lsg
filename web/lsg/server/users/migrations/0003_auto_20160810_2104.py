# -*- coding: utf-8 -*-
# Generated by Django 1.10 on 2016-08-10 21:04
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_wishlistitem'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='collection',
        ),
        migrations.RemoveField(
            model_name='user',
            name='wishlist',
        ),
    ]