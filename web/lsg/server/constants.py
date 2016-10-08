from django.conf import settings
from django_countries.fields import Country

from rest_framework import views
from rest_framework.status import HTTP_400_BAD_REQUEST

PHONE_CODES = dict(
    IE=353,
    GB=44,
    IM=44
)


def serialize_country(country):
    flag = country.flag if country.code in settings.SUPPORTED_COUNTRIES \
                        else '/static/img/flags/48x48/questionmark.png'
    return dict(
        name=country.name,
        code=country.code,
        flag=flag,
        phone_code=PHONE_CODES.get(country.code)
    )


def supported_countries_details():
    all_countries = []
    for code in settings.SUPPORTED_COUNTRIES:
        all_countries.append(serialize_country(Country(code)))
    return all_countries


class ConstantsView(views.APIView):

    def get(self, request, format=None):
        if request.user.is_authenticated():
            data = dict(
                countries=supported_countries_details()
            )
            return views.Response(data)
        else:
            return views.Response("User not authenticated.", status=HTTP_400_BAD_REQUEST)
