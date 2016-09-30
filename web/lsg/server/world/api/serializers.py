import geocoder
from django.contrib.gis.geos import Point
from rest_framework import serializers
from rest_framework.fields import ValidationError

from world.models import Address


class AddressSerializer(serializers.ModelSerializer):

    class Meta:
        model = Address
        fields = ('address1', 'address2', 'postal_code', 'city', 'state',
                  'country', 'latitude', 'longitude')
        read_only_fields = ('latitude', 'longitude')
        depth = 2

    def __init__(self, *args, **kwargs):
        super(AddressSerializer, self).__init__(*args, **kwargs)
        self._point = None

    def is_valid(self, raise_exception=False):
        is_valid = super(AddressSerializer, self).is_valid(raise_exception)
        point = self.retrieve_point_from_address(self._validated_data)
        if is_valid and not point:
            self._errors['address'] = ['Full address does not seem be be valid']
            if raise_exception:
                raise ValidationError(self.errors)
            return False
        return is_valid

    def retrieve_point_from_address(self, data):

        if self.instance:
            d = self._validated_data
            if d.get('address1') == self.instance.address1 and \
               d.get('address2') == self.instance.address2 and \
               d.get('postal_code') == self.instance.postal_code and \
               d.get('city') == self.instance.city and \
               d.get('state') == self.instance.state and \
               d.get('country') == self.instance.country:
                self._point = self.instance.point

        if self._point is None:
            if not data:
                return
            a = lambda k: "%s, " % (data.get(k) or '').strip() if \
                          (data.get(k) or '').strip() else ""
            full_address = "%s%s%s%s%s" % (
                a('address1'),
                a('address2'),
                a('city'),
                a('state'),
                data.get('country', '').strip()
            )
            results = geocoder.google(full_address, timeout=30)
            if results.wkt:
                self._point = results.wkt  # Point(location.longitude, location.latitude)
        return self._point

    def create(self, validated_data):
        point = self.retrieve_point_from_address(validated_data)
        validated_data['point'] = str(point)
        return super(AddressSerializer, self).create(validated_data)

    def update(self, instance, validated_data):
        point = self.retrieve_point_from_address(validated_data)
        validated_data['point'] = str(point)
        return super(AddressSerializer, self).update(instance, validated_data)
