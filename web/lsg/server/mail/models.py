from django.db import models
from django.contrib.contenttypes.models import ContentType
from jsonfield import JSONField

from request.models import SwapRequest


class EmailSchedule(models.Model):
    subject = models.CharField(max_length=255)
    template_name = models.CharField(max_length=128)
    email = models.EmailField()
    send_at = models.DateTimeField()
    sent = models.BooleanField(default=False)
    swap_request = models.ForeignKey(SwapRequest, null=True, blank=True)
    context_json = JSONField(null=True, blank="")
    cancelled = models.BooleanField(default=False)

    def __str__(self):
        prefix = "PENDING"
        if self.cancelled:
            prefix = "CANCELLED"
        elif self.sent:
            prefix = "ALREADY SENT"
        args = (prefix, self.email, self.send_at.date(),
                self.subject % self.context)
        return '%s scheduled email to <%s> at %s: "%s"' % args

    @property
    def context(self):
        context = dict()
        for key, item in self.context_json.items():
            if isinstance(item, dict) and 'content_type' in item:
                app, model = item['content_type'].split('.')
                ct = ContentType.objects.get(app_label=app, model=model)
                model = ct.model_class()
                context[key] = model.objects.get(pk=item['pk'])
            else:
                context[key] = item
        return context

    @staticmethod
    def serialize_context(context):
        serialized = dict()
        for key, value in context.items():
            if isinstance(value, models.Model):
                app = value._meta.app_label
                model = value._meta.model_name
                serialized[key] = dict(content_type='%s.%s' % (app, model),
                                       pk=value.pk)
            else:
                serialized[key] = value
        return serialized

    @staticmethod
    def cancel(template_name, swap_request, **kwargs):
        schedules = EmailSchedule.objects.filter(template_name=template_name,
                                                 swap_request=swap_request,
                                                 sent=False, **kwargs)
        return schedules.update(cancelled=True)
