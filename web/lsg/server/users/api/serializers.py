from rest_framework import serializers
from rest_framework.fields import ValidationError
#from rest_framework_cache.registry import cache_registry
#from rest_framework_cache.serializers import CachedSerializerMixin

from drf_extra_fields.fields import Base64ImageField

from users.models import CollectionItem, WishlistItem, User
from users.activities import Verbs
from games.models import Game
from games.api.serializers import GameSerializer
from games.api.views import PlatformViewSet
from world.api.serializers import AddressSerializer, BasicAddressSerializer


class UserPictureImageSerializer(serializers.ModelSerializer):

    picture_image = Base64ImageField()

    class Meta:
        model = User
        fields = ('picture_image',)


class SmallUserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ('username', 'name', 'email', 'id', 'picture', 'stars', 'joined',
                  'succeeded_swaps_count', 'failed_swaps_count', 'expired_swaps_count',
                  'negative_feedback_count', 'positive_feedback_count', 'neutral_feedback_count')
        read_only_fields = fields
        depth = 0


class UserCountsStarsSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ('succeeded_swaps_count', 'failed_swaps_count', 'joined',
                  'expired_swaps_count', 'negative_feedback_count', 'stars',
                  'positive_feedback_count', 'neutral_feedback_count',
                  'enabled', 'deleted')
        read_only_fields = fields
        depth = 0


class RequestUserNoFullAddressSerializer(serializers.ModelSerializer):

    address = BasicAddressSerializer(source='_address')

    class Meta:
        model = User
        fields = ('username', 'name', 'email', 'picture', 'first_name',
                  'last_name', 'gender', 'address', 'phone1_prefix', 'phone1',
                  'succeeded_swaps_count', 'failed_swaps_count', 'joined',
                  'expired_swaps_count', 'negative_feedback_count', 'stars',
                  'positive_feedback_count', 'neutral_feedback_count',
                  'social_links', 'id', 'show_full_address_allowed')
        read_only_fields = fields


class RequestUserSerializer(RequestUserNoFullAddressSerializer):

    address = AddressSerializer(source='_address')


class UserSerializer(serializers.ModelSerializer):

    address = AddressSerializer(source='_address')

    class Meta:
        model = User
        fields = ('username', 'name', 'email', 'picture', 'first_name',
                  'last_name', 'gender', 'address', 'phone1_prefix', 'phone1',
                  'succeeded_swaps_count', 'failed_swaps_count',
                  'expired_swaps_count', 'negative_feedback_count', 'stars',
                  'positive_feedback_count', 'neutral_feedback_count',
                  'social_links', 'enabled', 'id', 'distance_unit', 'deleted',
                  'show_full_address_allowed')
        read_only_fields = ('username', 'name', 'picture', 'enabled',
                            'succeeded_swaps_count',
                            'failed_swaps_count', 'expired_swaps_count',
                            'negative_feedback_count',
                            'positive_feedback_count',
                            'neutral_feedback_count', 'stars', 'social_links',
                            'id', 'deleted')
        #extra_kwargs = {'first_name': {'required': True, 'allow_blank': False},
        #                'last_name': {'required': True, 'allow_blank': False},
        #                'phone1': {'required': True, 'allow_blank': False},
        #                'platforms': {'required': True, 'allow_blank': False}}

        #extra_kwargs = {'platforms': {'required': False, 'allow_blank': True}}

        depth = 2

    def is_valid(self, raise_exception=False):
        is_valid = super(UserSerializer, self).is_valid(raise_exception)
        #if not self._validated_data['platforms']:
        #    self._errors['platforms'] = ['This field is required.']
        #    if raise_exception:
        #        raise ValidationError(self.errors)
        #    return False
        if is_valid:
            if '_address' not in self._validated_data:
                return True
            address_serializer = AddressSerializer(
                data=self._validated_data.pop('_address'),
                instance=self.instance.address
            )
            self.fields['address'] = address_serializer
            is_valid = address_serializer.is_valid()
            self._errors.update(address_serializer.errors)
            if not is_valid and raise_exception:
                raise ValidationError(self.errors)
        return is_valid

    def update(self, instance, validated_data):
        address_serializer = self.fields['address']
        if instance.address:
            if address_serializer.validated_data.get('geocoder_address') or \
               address_serializer.validated_data.get('country'):
                address_serializer.update(instance.address,
                                          address_serializer.validated_data)
        else:
            if address_serializer.validated_data.get('geocoder_address') or \
               address_serializer.validated_data.get('country'):
                instance.address = address_serializer.create(address_serializer.validated_data)
        instance = super(UserSerializer, self).update(instance, validated_data)
        Verbs.changed_profile_details.send(instance)
        return instance

    def create(self, validated_data):
        address_serializer = self.fields['address']
        address = address_serializer.create(address_serializer.validated_data)
        user = super(UserSerializer, self).create(validated_data)
        user.address = address
        user.save()
        return user

    def to_representation(self, instance):
        serialized = super(UserSerializer, self).to_representation(instance)
        address_serializer = self.fields['address']
        if not serialized.get('address'):
            serialized['address'] = address_serializer.to_representation(instance._address)
        return serialized

#cache_registry.register(UserSerializer)


class UserGameMixin(object):

    def is_valid(self, raise_exception=False):
        is_valid = super(UserGameMixin, self).is_valid(raise_exception)
        if is_valid:
            user_pk = self.context['view'].kwargs['user_pk']
            game_id = self.validated_data['game_id']
            model = self.root.Meta.model
            if model.objects.filter(user_id=user_pk, game_id=game_id).exists():
                game = Game.objects.get(pk=game_id)
                self._errors['game_id'] = ['Game "%s" already in collection.' %
                                           game]
                is_valid = False
            else:
                # sets the user_id data to the view
                user_pk = self.context['view'].kwargs['user_pk']
                self._validated_data['user_id'] = user_pk
        if not is_valid and raise_exception:
            raise ValidationError(self.errors)
        return is_valid


class CollectionSerializer(serializers.ListSerializer):

    def to_representation(self, data):
        result = super(CollectionSerializer, self).to_representation(data)
        categorized = {}
        for item in result:
            platform = item['game']['platform']
            key = platform['id']
            categorized.setdefault(key, [])
            categorized[key].append(item)
        items = [dict(platform=v[0]['game']['platform'],
                      items=sorted(v, key=lambda x: x['game']['name']))
                 for v in categorized.values()]
        return sorted(items, key=lambda x: x['platform']['short_name'])


class CollectionItemSerializer(UserGameMixin, serializers.ModelSerializer):
    game_id = serializers.IntegerField(write_only=True)
    user_id = serializers.IntegerField(read_only=True)
    game = GameSerializer(read_only=True)

    class Meta:
        model = CollectionItem
        fields = ('id', 'game', 'game_id', 'user_id')
        depth = 2
        list_serializer_class = CollectionSerializer

    def create(self, *args, **kwargs):
        instance = super(CollectionItemSerializer, self).create(*args,
                                                                **kwargs)
        Verbs.added_to_collection.send(instance.user, instance.game)
        return instance

#cache_registry.register(CollectionItemSerializer)


class WishlistItemSerializer(UserGameMixin, serializers.ModelSerializer):
    game_id = serializers.IntegerField(write_only=True)
    user_id = serializers.IntegerField(read_only=True)
    game = GameSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = ('id', 'game', 'game_id', 'user_id')
        depth = 2
        list_serializer_class = CollectionSerializer

    def create(self, *args, **kwargs):
        instance = super(WishlistItemSerializer, self).create(*args, **kwargs)
        Verbs.added_to_wishlist.send(instance.user, instance.game)
        return instance

#cache_registry.register(WishlistItemSerializer)
