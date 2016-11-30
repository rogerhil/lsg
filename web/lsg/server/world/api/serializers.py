from django_countries.serializer_fields import CountryField
from django_countries import countries
from django.conf import settings
from rest_framework import serializers
from rest_framework.fields import ValidationError
#from rest_framework_cache.registry import cache_registry
#from rest_framework_cache.serializers import CachedSerializerMixin

from world.models import Address
from constants import serialize_country

COUNTRIES_NAMES = [str(countries.name(i)) for i in settings.SUPPORTED_COUNTRIES]


class CustomCountryField(CountryField):

    def to_representation(self, obj):
        return serialize_country(obj)


class AddressSerializer(serializers.ModelSerializer):
    country = CustomCountryField()

    class Meta:
        model = Address
        fields = ('geocoder_address', 'address1', 'address2', 'city', 'state', 'country',
                  'latitude', 'longitude')
        read_only_fields = ('address1', 'address2', 'postal_code', 'city', 'state', 'latitude',
                            'longitude')
        depth = 2

    def __init__(self, *args, **kwargs):
        super(AddressSerializer, self).__init__(*args, **kwargs)
        self._point = None

    def is_valid(self, raise_exception=False):
        is_valid = super(AddressSerializer, self).is_valid(raise_exception)
        country = self._validated_data.get('country')
        location = self._validated_data.get('geocoder_address')
        if is_valid and country in settings.SUPPORTED_COUNTRIES and not location:
            return True
        geo = Address.get_geocode_obj_from_address(location, country)
        if geo:
            if not geo.wkt:
                self._errors.setdefault('address', [])
                self._errors['address'].append('Full address does not seem be be valid')
            if geo.country not in settings.SUPPORTED_COUNTRIES:
                self._errors.setdefault('address', [])
                self._errors['address'].append("Let'SwapGames is only supported in the following "
                                               "countries: %s" % ', '.join(COUNTRIES_NAMES))
            if not geo.city_long:
                self._errors.setdefault('address', [])
                self._errors['address'].append("City must be specified.")
            if not geo.housenumber and not geo.street_long and not geo.road_long:
                self._errors.setdefault('address', [])
                self._errors['address'].append("Minimum location required, e.g.: street, road, "
                                               "number, etc.")

        if self.errors:
            if raise_exception:
                raise ValidationError(self.errors)
            return False
        return is_valid

    def create(self, validated_data):
        location = validated_data.get('geocoder_address')
        country = validated_data.get('country')
        if location:
            data = Address.parse_address_data(location, country)
            validated_data.update(data)
        return super(AddressSerializer, self).create(validated_data)

    def update(self, instance, validated_data):
        location = validated_data.get('geocoder_address')
        country = validated_data.get('country')
        if location:
            data = Address.parse_address_data(location, country)
            validated_data.update(data)
        else:
            validated_data['point'] = None
        return super(AddressSerializer, self).update(instance, validated_data)

#cache_registry.register(AddressSerializer)
