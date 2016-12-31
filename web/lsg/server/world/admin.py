from django.contrib import admin

from .models import Address


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('address1', 'address2', 'city', 'state', 'country',
                    'postal_code')
    list_filter = ('country',)
    search_fields = ('address1', 'address2', 'city', 'state', 'country',
                     'postal_code')

    class Media:
        js = ('https://cdnjs.cloudflare.com/ajax/libs/openlayers/2.13.1/OpenLayers.js',)