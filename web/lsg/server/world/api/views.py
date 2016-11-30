from rest_framework import viewsets

from world.models import Address
from world.api.serializers import AddressSerializer


class AddressViewSet(viewsets.ModelViewSet):
    queryset = Address.objects.all()
    serializer_class = AddressSerializer
