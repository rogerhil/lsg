import geocoder
from django.contrib.gis.geos import Point
from rest_framework import serializers
from rest_framework.fields import ValidationError

from world.models import Address, AVAILABLE_COUNTRIES


class AddressSerializer(serializers.ModelSerializer):

    class Meta:
        model = Address
        #fields = ('address1', 'address2', 'postal_code', 'city', 'state',
        #          'country', 'latitude', 'longitude')
        fields = ('geocoder_address', 'address1', 'country', 'latitude', 'longitude')
        read_only_fields = ('address1', 'address2', 'postal_code', 'city',
                            'state', 'latitude', 'longitude')
        depth = 2

    def __init__(self, *args, **kwargs):
        super(AddressSerializer, self).__init__(*args, **kwargs)
        self._point = None

    def is_valid(self, raise_exception=False):
        is_valid = super(AddressSerializer, self).is_valid(raise_exception)
        country = self._validated_data.get('country')
        if is_valid and country in AVAILABLE_COUNTRIES:
            return True
        geo = self.get_geocode_obj_from_address(self._validated_data)
        if geo:
            if not geo.wkt:
                self._errors.setdefault('address', [])
                self._errors['address'].append('Full address does not seem be be valid')
            if geo.country_long not in AVAILABLE_COUNTRIES:
                self._errors.setdefault('address', [])
                self._errors['address'].append("Let'SwapGames is only supported in the following "
                                               "countries: %s" % ', '.join(AVAILABLE_COUNTRIES))
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

    def get_geocode_obj_from_address(self, data):
        if not data or not data.get('geocoder_address'):
            return
        geocoder_address = data.get('geocoder_address')
        print('$$$$$$$$$$$$$$$$')
        print(geocoder_address)
        print('$$$$$$$$$$$$$$$$')
        geo = geocoder.google(geocoder_address, components="country:IE", timeout=30)
        print(geo)
        print(geo.wkt)
        return geo

    def parse_address_data(self, validated_data):
        geo = self.get_geocode_obj_from_address(validated_data)
        if geo is None:
            return

        def join(*args):
            return ' '.join(set([i for i in args if i and i.strip()]))

        validated_data.update(dict(
            point=str(geo.wkt),
            address1=join(geo.housenumber, geo.street_long, geo.road_long),
            address2=join(geo.neighborhood, geo.sublocality),
            city=geo.city_long,
            state=join(geo.state_long, geo.province_long),
            country=geo.country_long,
            postal_code=geo.postal,
            geocoder_address=geo.address
        ))

    def create(self, validated_data):
        self.parse_address_data(validated_data)
        return super(AddressSerializer, self).create(validated_data)

    def update(self, instance, validated_data):
        self.parse_address_data(validated_data)
        return super(AddressSerializer, self).update(instance, validated_data)
