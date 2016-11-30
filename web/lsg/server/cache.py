from django.db.models import signals

from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework_cache.cache import cache
from rest_framework_cache.settings import api_settings


def get_cache_key(key, obj_id):
    return "%s_%s" % (key, obj_id)


class ModelViewsetCacheRegistry(object):

    def __init__(self):
        self._registry = {}

    def register(self, viewset):
        model = viewset.queryset.model

        if model not in self._registry:
            self._registry[model] = []

        if viewset in self._registry[model]:
            raise Exception("Serializer %s is already registered" % str(model))

        self._registry[model].append(viewset)
        signals.post_save.connect(self.clear_cache, sender=model)
        signals.pre_delete.connect(self.clear_cache, sender=model)

    def get(self, model):
        return self._registry.get(model, [])

    @staticmethod
    def clear_cache(instance, *args, **kwargs):
        viewsets = registry.get(instance._meta.model)
        keys = []
        for viewset in viewsets:
            for cache_obj_key in viewset.cache_obj_keys:
                cache_key = get_cache_key(viewset.__name__,
                                          getattr(instance, cache_obj_key))
                keys.append(cache_key)
        cache.delete_many(keys)

    #def autodiscover(self):
    #    autodiscover_modules('serializers')

registry = ModelViewsetCacheRegistry()


class MetaCachedViewSet(type):

    def __new__(mcs, name, bases, attrs, **kwargs):
        klass = super(MetaCachedViewSet, mcs).__new__(mcs, name, bases, attrs, **kwargs)
        print(klass)
        if getattr(klass, 'queryset', None):
            registry.register(klass)
        return klass


class CachedViewSetMixin(object, metaclass=MetaCachedViewSet):

    cache_kwargs_key = None
    cache_obj_keys = None

    def list(self, request, *args, **kwargs):
        if self.cache_kwargs_key is None:
            raise Exception('cache_kwargs_key must be set for %s' % self)
        obj_id = self.kwargs.get(self.cache_kwargs_key)
        cache_key = get_cache_key(self.__class__.__name__, obj_id)
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super(CachedViewSetMixin, self).list(request, *args, **kwargs)
        cache.set(cache_key, response.data, api_settings.DEFAULT_CACHE_TIMEOUT)
        return response
