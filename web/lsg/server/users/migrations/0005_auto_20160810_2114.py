# -*- coding: utf-8 -*-
# Generated by Django 1.10 on 2016-08-10 21:14
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0001_initial'),
        ('users', '0004_auto_20160810_2113'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='collection',
            field=models.ManyToManyField(editable=False, related_name='collections', through='users.CollectionItem', to='games.Game'),
        ),
        migrations.AddField(
            model_name='user',
            name='wishlist',
            field=models.ManyToManyField(editable=False, related_name='wished', through='users.WishlistItem', to='games.Game'),
        ),
    ]
