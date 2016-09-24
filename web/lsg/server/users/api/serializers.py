from rest_framework import serializers
from rest_framework.fields import ValidationError

from drf_extra_fields.fields import Base64ImageField

from users.models import CollectionItem, WishlistItem, User
from users.activities import Verbs
from games.models import Game
from games.api.serializers import GameSerializer
from games.api.views import PlatformViewSet
from world.api.serializers import AddressSerializer


class UserPictureImageSerializer(serializers.ModelSerializer):

    picture_image = Base64ImageField()

    class Meta:
        model = User
        fields = ('picture_image',)


class UserSerializer(serializers.ModelSerializer):

    address = AddressSerializer(source='_address')
    platforms = serializers.PrimaryKeyRelatedField(many=True, read_only=False,
                                             queryset=PlatformViewSet.queryset)

    class Meta:
        model = User
        fields = ('username', 'name', 'email', 'picture', 'first_name',
                  'last_name', 'gender', 'address', 'phone1', 'phone2',
                  'platforms', 'succeeded_swaps_count', 'failed_swaps_count',
                  'expired_swaps_count', 'negative_feedback_count', 'stars',
                  'positive_feedback_count', 'neutral_feedback_count', 'id')
        read_only_fields = ('username', 'name', 'email', 'picture',
                            'succeeded_swaps_count',
                            'failed_swaps_count', 'expired_swaps_count',
                            'negative_feedback_count',
                            'positive_feedback_count',
                            'neutral_feedback_count', 'stars')
        extra_kwargs = {'first_name': {'required': True, 'allow_blank': False},
                        'last_name': {'required': True, 'allow_blank': False},
                        'phone1': {'required': True, 'allow_blank': False}}

        depth = 2

    def is_valid(self, raise_exception=False):
        is_valid = super(UserSerializer, self).is_valid(raise_exception)
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
            address_serializer.update(instance.address,
                                      address_serializer.validated_data)
        else:
            instance.address = address_serializer.create(
                                      address_serializer.validated_data)
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


class CollectionItemSerializer(UserGameMixin, serializers.ModelSerializer):
    game_id = serializers.IntegerField(write_only=True)
    user_id = serializers.IntegerField(read_only=True)
    game = GameSerializer(read_only=True)

    class Meta:
        model = CollectionItem
        fields = ('id', 'weight', 'game', 'game_id', 'user_id')
        depth = 2

    def create(self, *args, **kwargs):
        instance = super(CollectionItemSerializer, self).create(*args,
                                                                **kwargs)
        Verbs.added_to_collection.send(instance.user, instance.game)
        return instance


class WishlistItemSerializer(UserGameMixin, serializers.ModelSerializer):
    game_id = serializers.IntegerField(write_only=True)
    user_id = serializers.IntegerField(read_only=True)
    game = GameSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = ('id', 'game', 'game_id', 'user_id')
        depth = 2

    def create(self, *args, **kwargs):
        instance = super(WishlistItemSerializer, self).create(*args, **kwargs)
        Verbs.added_to_wishlist.send(instance.user, instance.game)
        return instance