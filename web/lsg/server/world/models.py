import geocoder
from django.contrib.gis.db import models
from django_countries.fields import CountryField

# AVAILABLE_COUNTRIES = [
#     'United Kingdom',
#     'Ireland',
#     'Isle of Man'
# ]
#
# COUNTRIES_CHOICES = [(i, i) for i in AVAILABLE_COUNTRIES]


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
    city = models.CharField(max_length=128)
    state = models.CharField(max_length=128, null=True, blank=True)
    country = CountryField()  #choices=COUNTRIES_CHOICES)
    postal_code = models.CharField(max_length=32, null=True, blank=True)
    geocoder_address = models.CharField(max_length=255, null=True, blank=True)
    point = models.PointField(blank=True, null=True)

    objects = models.GeoManager()

    def __str__(self):
        return self.full_address

    @property
    def full_address(self):
        addr1 = self.address1 or ""
        addr2 = ", %s" % self.address2 \
                    if self.address2 and self.address2.strip() else ""
        address = "%s%s" % (addr1.strip(), addr2)
        return "%s, %s, %s, %s" % (address, self.city, self.state,
                                   self.country)

    @property
    def longitude(self):
        return self.point.coords[0] if self.point else None

    @property
    def latitude(self):
        return self.point.coords[1] if self.point else None

    @staticmethod
    def get_geocode_obj_from_address(location, country=None):
        kwargs = {}
        if country:
            kwargs['components'] = "country:%s" % country
        geo = geocoder.google(location, timeout=30, **kwargs)
        return geo

    @classmethod
    def parse_address_data(cls, location, country=None):
        geo = cls.get_geocode_obj_from_address(location, country)
        if geo is None:
            return {}

        def join(*args):
            return ' '.join(set([i for i in args if i and i.strip()]))

        data = dict(
            point=str(geo.wkt),
            address1=join(geo.housenumber, geo.street_long, geo.road_long),
            address2=join(geo.neighborhood, geo.sublocality),
            city=geo.city_long,
            state=join(geo.state_long, geo.province_long),
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
