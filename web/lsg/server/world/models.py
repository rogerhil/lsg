import geocoder
import logging

from django.conf import settings
from django.contrib.gis.db import models
from django_countries.fields import CountryField

# AVAILABLE_COUNTRIES = [
#     'United Kingdom',
#     'Ireland',
#     'Isle of Man'
# ]
#
# COUNTRIES_CHOICES = [(i, i) for i in AVAILABLE_COUNTRIES]

logger = logging.getLogger('lsg')


class WorldBorder(models.Model):
    # Regular Django fields corresponding to the attributes in the
    # world borders shapefile.
    name = models.CharField(max_length=50)
    area = models.IntegerField()
    pop2005 = models.IntegerField('Population 2005')
    fips = models.CharField('FIPS Code', max_length=2)
    iso2 = models.CharField('2 Digit ISO', max_length=2)
    iso3 = models.CharField('3 Digit ISO', max_length=3)
    un = models.IntegerField('United Nations Code')
    region = models.IntegerField('Region Code')
    subregion = models.IntegerField('Sub-Region Code')
    lon = models.FloatField()
    lat = models.FloatField()

    # GeoDjango-specific: a geometry field (MultiPolygonField), and
    # overriding the default manager with a GeoManager instance.
    mpoly = models.MultiPolygonField()
    objects = models.GeoManager()

    # Returns the string representation of the model.
    def __str__(self):              # __unicode__ on Python 2
        return self.name


class Address(models.Model):
    address1 = models.CharField(max_length=255)
    address2 = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=128, null=True, blank=True)
    state = models.CharField(max_length=128, null=True, blank=True)
    country = CountryField()  #choices=COUNTRIES_CHOICES)
    postal_code = models.CharField(max_length=32, null=True, blank=True)
    geocoder_address = models.CharField(max_length=255, null=True, blank=True)
    point = models.PointField(blank=True, null=True)
    city_point = models.PointField(blank=True, null=True)

    objects = models.GeoManager()

    def __str__(self):
        return self.full_address

    @property
    def full_address(self):
        if self.geocoder_address:
            return self.geocoder_address
        addr1 = self.address1 or ""
        addr2 = ", %s" % self.address2 \
                    if self.address2 and self.address2.strip() else ""
        address = "%s%s" % (addr1.strip(), addr2)
        address_list = [address, self.city, self.state, str(self.country)]
        return ', '.join([i for i in address_list if i and i.strip()])

    @property
    def longitude(self):
        return self.point.coords[0] if self.point else None

    @property
    def latitude(self):
        return self.point.coords[1] if self.point else None

    @property
    def city_longitude(self):
        return self.city_point.coords[0] if self.city_point else None

    @property
    def city_latitude(self):
        return self.city_point.coords[1] if self.city_point else None

    @staticmethod
    def get_geocode_obj_from_address(location, country=None):
        kwargs = {}
        if country:
            kwargs['components'] = "country:%s" % country
        geo = geocoder.google(location, timeout=30, key=settings.GOOGLE_GEOCODING_KEY, **kwargs,
                              language='en')
        return geo

    @classmethod
    def parse_address_data(cls, location, country=None):
        geo = cls.get_geocode_obj_from_address(location, country)
        if geo is None:
            logger.warning("geocode not found for: %s (%s)" % (location, country))
            return {}

        def join(*args):
            return ' '.join(set([i for i in args if i and i.strip()]))

        city = geo.city_long or ""
        state = join(geo.state_long, geo.province_long)
        city_location = "%s, %s, %s" % (city, state, geo.country)
        geo_city = cls.get_geocode_obj_from_address(city_location, country)

        if geo_city is None:
            logger.warning("geocode not found for city: %s (%s)" % (city_location, country))

        data = dict(
            point=str(geo.wkt),
            city_point=str(geo_city.wkt) if geo_city else None,
            address1=join(geo.housenumber, geo.street_long, geo.road_long),
            address2=join(geo.neighborhood, geo.sublocality),
            city=city,
            state=state,
            country=geo.country,
            postal_code=geo.postal,
            geocoder_address=geo.address
        )
        return data

    @classmethod
    def create_from_location(cls, location, country=None):
        data = cls.parse_address_data(location, country)
        address = cls(**data)
        address.save()
        return address
