import re
from rest_framework.permissions import BasePermission


class IsSuperUser(BasePermission):

    def has_permission(self, request, view):
        return request.user and request.user.is_superuser

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsSuperUserOrOwner(IsSuperUser):

    accept_terms_regex = re.compile(r'^/api/users/\d+/accept-terms/$')

    def is_accept_terms(self, request):
        return request.method == 'PUT' and self.accept_terms_regex.match(request.path)

    def has_permission(self, request, view):
        is_superuser = super(IsSuperUserOrOwner, self).has_permission(request,
                                                                      view)
        if is_superuser:
            return True
        user = request.user
        kwargs = request._request.resolver_match.kwargs
        pk = kwargs.get('user_pk', kwargs.get('pk'))
        return user.is_authenticated() and pk == str(user.pk) and \
               (user.accepted_terms or self.is_accept_terms(request))

    def has_object_permission(self, request, view, obj):
        is_superuser = super(IsSuperUserOrOwner, self)\
                                     .has_object_permission(request, view, obj)
        return is_superuser or (obj.pk == request.user.pk and (obj.accepted_terms or
                                                               self.is_accept_terms(request)))
