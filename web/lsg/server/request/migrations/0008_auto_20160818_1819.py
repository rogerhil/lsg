# -*- coding: utf-8 -*-
# Generated by Django 1.10 on 2016-08-18 18:19
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('request', '0007_swaprequest_requested_game_condition_notes'),
    ]

    operations = [
        migrations.AlterField(
            model_name='swaprequest',
            name='requested_game_condition',
            field=models.CharField(blank=True, choices=[('bad', 'Bad'), ('good', 'Good'), ('very_good', 'Very Good')], max_length=16, null=True),
        ),
    ]
