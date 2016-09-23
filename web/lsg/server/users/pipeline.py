import logging
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

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
                city, country = map(lambda x: x.strip(),
                                    location['name'].split(','))
                address = Address(city=city, country=country)
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

    elif backend.name == 'google-oauth2':
        if not user.address:
            locations = [l['value'] for l in response.get('placesLived', [])
                         if l.get('primary') and l.get('value')]
            if locations:
                city, country = map(lambda x: x.strip(),
                                    locations[0].split('/'))
                address = Address(city=city, country=country)
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

    elif backend.name == 'twitter':
        if not user.address:
            location = response.get('location', '').strip()
            if location:
                city, state = map(lambda x: x.strip(), location.split(','))
                address = Address(city=city, state=state)
                address.save()
                user.address = address
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
