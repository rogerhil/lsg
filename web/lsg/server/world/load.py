import os
import sys
import django

world_mapping = {
    'fips' : 'FIPS',
    'iso2' : 'ISO2',
    'iso3' : 'ISO3',
    'un' : 'UN',
    'name' : 'NAME',
    'area' : 'AREA',
    'pop2005' : 'POP2005',
    'region' : 'REGION',
    'subregion' : 'SUBREGION',
    'lon' : 'LON',
    'lat' : 'LAT',
    'mpoly' : 'MULTIPOLYGON',
}


BASE_PATH = os.path.abspath(os.path.dirname(__file__))
world_shp = os.path.join(BASE_PATH, 'data', 'TM_WORLD_BORDERS-0.3.shp')


def run(verbose=True):
    from django.contrib.gis.utils import LayerMapping
    from world.models import WorldBorder
    if WorldBorder.objects.all().count():
        print('WorldBorder already created.')
        return
    lm = LayerMapping(WorldBorder, world_shp, world_mapping,
                      transform=False, encoding='iso-8859-1')
    lm.save(strict=True, verbose=verbose)


if __name__ == '__main__':
    sys.path.append(os.path.abspath(os.path.join(BASE_PATH, '..')))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    django.setup()
    run()
