import logging
import geocoder
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from django_countries import countries

from django.core.files import File
from django.core.files.temp import NamedTemporaryFile

from world.models import Address

FACEBOOK_social_picture_url = "http://graph.facebook.com/%s/picture?type=normal"


logger = logging.getLogger('django')


def get_image_data(url, **params):
    data = urlencode(params)
    sep = "?"
    if "?" in url:
        sep = "&"
    url = "%s%s%s" % (url, sep, data)
    request = Request(url, method='GET')
    try:
        with urlopen(request) as response:
            return response.read()
    except HTTPError as err:
        logger.error('Error while trying  to retrieve image data from url %s: '
                     '%s' % (url, err))


def save_profile(backend, user, response, *args, **kwargs):
    changed = False
    if backend.name == 'facebook':
        if not user.address:
            location = response.get('location')
            if location:
                city_country = map(lambda x: x.strip(), location['name'].split(','))
                if len(city_country) == 2:
                    city, country = city_country
                    code = countries.by_name(country)
                    address = Address(city=city, country=code)
                    address.save()
                    user.address = address
                    changed = True
        if not user.social_picture_url:
            picture_data = response['picture']['data']
            if not picture_data['is_silhouette']:
                user.social_picture_url = FACEBOOK_social_picture_url % response['id']
                changed = True
        if not user.gender:
            user.gender = response.get('gender')
            changed = True
        #import requests
        #social = user.social_auth.get(provider='facebook')
        #url = u'https://graph.facebook.com/{0}/friends?fields=id,name,location,picture&access_token={1}'.format(social.uid, social.extra_data['access_token'])
        #req = requests.get(url)
        #print(req.json())

    elif backend.name == 'google-oauth2':

        if not user.address:
            locations = [l['value'] for l in response.get('placesLived', [])
                         if l.get('primary') and l.get('value')]
            if locations:
                city_country = map(lambda x: x.strip(),
                                    locations[0].split('/'))
                if len(city_country) == 2:
                    city, country = city_country
                    code = countries.by_name(country)
                    address = Address(city=city, country=code)
                    address.save()
                    user.address = address
                    changed = True
        if not user.social_picture_url:
            if not response['image'].get('isDefault'):
                url = "%s?sz=100" % response['image']['url'].split('?sz=')[0]
                user.social_picture_url = url
                changed = True
        if not user.gender:
            user.gender = response.get('gender')
            changed = True
        social_user = user.social_auth.get(provider='google-oauth2')
        data = social_user.extra_data
        data['id'] = response['id']
        social_user.set_extra_data(data)
        social_user.save()

    elif backend.name == 'twitter':
        if not user.address:
            location = response.get('location', '').strip()
            if location:
                user.address = Address.create_from_location(location)
                changed = True
        if not user.social_picture_url:
            if not response['default_profile']:
                url = response['profile_image_url'].replace('normal.',
                                                            'bigger.')
                user.social_picture_url = url
                changed = True

    if changed:
        if user.social_picture_url:
            resp = get_image_data(user.social_picture_url)
            filename = user.social_picture_url.split('?')[0].split('/')[-1]
            with NamedTemporaryFile(delete=True) as img_temp:
                img_temp.write(resp)
                img_temp.flush()
                user.picture_image.save(filename, File(img_temp))
        user.save()
