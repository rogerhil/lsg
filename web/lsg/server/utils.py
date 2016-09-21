import inspect
import re

from django.utils.timesince import timesince


class Choices:

    @classmethod
    def choices(cls):
        return cls.raw_choices(lambda x: x.replace('_', ' ').title())

    @classmethod
    def display(cls, value):
        return dict(cls.choices())[value]

    @classmethod
    def attr(cls, value):
        return dict(cls.raw_choices())[value]

    @classmethod
    def raw_choices(cls, clean_title=lambda x: x):
        return [(getattr(cls, i), clean_title(i)) for i in dir(cls)
                if not i.startswith('__') and not i.endswith('__') and not
                inspect.ismethod(getattr(cls, i))]


timesince_regex = re.compile(r'^(\d+)\s+(\w+)$')


def short_timesince(timestamp):
    trans = dict(
        year='y',
        years='y',
        month='M',
        months='M',
        week='w',
        weeks='w',
        day='d',
        days='d',
        hour='h',
        hours='h',
        minute='m',
        minutes='m',
    )
    result = timesince(timestamp)
    prefix = ""
    if ',' in result:
        p1, p2 = result.split(',', 2)
        p2 = p2.split(',')[0].strip()
        amount, unit = timesince_regex.match(p2).groups()
        amount = int(amount)
        if unit == 'minutes' and amount >= 45 or \
           unit == 'months' and amount >= 9 or \
           unit == 'days' and amount >= 23 or \
           unit == 'hours' and amount >= 18 or \
           unit == 'weeks' and amount >= 3:
            prefix = "~"
        result = p1
    amount, unit = timesince_regex.match(result).groups()
    amount = int(amount)
    if prefix:
        amount += 1
    if int(amount) == 0 and unit == 'minutes':
        return "now"
    return "%s%s%s" % (prefix, amount, trans.get(unit, unit))
