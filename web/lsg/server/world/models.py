from django.contrib.gis.db import models
from django.contrib.gis.geos import Point
from django.db.models.signals import pre_save

from geopy.geocoders import Nominatim


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
    country = models.CharField(max_length=128)
    postal_code = models.CharField(max_length=32, null=True, blank=True)
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

    @classmethod
    def update_point(cls, sender, instance, **kwargs):
        geolocator = Nominatim()
        # XXX: the line below might fail due to socket.error exception
        # XXX: location can also be None if the address is not found
        location = geolocator.geocode(instance.full_address)
        if location is not None:
            instance.point = Point(location.longitude, location.latitude)


#pre_save.connect(Address.update_point, sender=Address)

