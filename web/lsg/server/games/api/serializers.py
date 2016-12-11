from django.conf import settings
from games.models import Game, Platform
from rest_framework import serializers
#from rest_framework_cache.registry import cache_registry
#from rest_framework_cache.serializers import CachedSerializerMixin


class LocalGameImagesSerializer(serializers.Serializer):
    front_thumb_medium = serializers.URLField()
    #front_thumb_small = serializers.URLField()
    #front_thumb = serializers.URLField()


class CategorizedPlatformSerializer(serializers.ListSerializer):

    def to_representation(self, data):
        result = super(CategorizedPlatformSerializer, self).to_representation(data)
        popular = []
        retro = []
        for item in result:
            if item['name'] in settings.RETRO_PLATFORMS:
                retro.append(item)
            else:
                popular.append(item)
        return [popular, retro]


class PlatformSerializer(serializers.ModelSerializer):

    class Meta:
        model = Platform
        fields = ('id', 'name', 'short_name', 'logo_image',
                  'logo_image_horizontal', 'logo_image_vertical')
        read_only_fields = fields
        list_serializer_class = CategorizedPlatformSerializer

    #cache_registry.register(PlatformSerializer)


class GameSerializer(serializers.ModelSerializer):
    images = LocalGameImagesSerializer()
    platform = PlatformSerializer()

    class Meta:
        model = Game
        fields = ('id', 'api_id', 'name', 'images', 'platform', 'full_name')
        read_only_fields = fields
        #exclude = ('api_rating', 'similar', 'similar_count',
        #           'youtube', 'genres')
        depth = 1

#cache_registry.register(GameSerializer)


class CategorizedGameSerializer(serializers.Serializer):
    name = serializers.CharField(read_only=True)
    id = serializers.IntegerField(read_only=True)
    platform = serializers.CharField(read_only=True)

    _map = dict(name='label', platform='category')

    def to_representation(self, instance):
        r = super(CategorizedGameSerializer, self).to_representation(instance)
        new_data = dict()
        for key, value in r.items():
            new_key = self._map.get(key)
            new_data[new_key or key] = value
        return new_data
