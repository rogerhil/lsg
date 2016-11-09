from django.contrib import admin

from users.models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name',
                    'address', 'social_links')
    search_fields = ('username', 'email', 'first_name', 'last_name')

    def social_links(self, instance):
        return ', '.join(['<a href="%s" target="_blank">%s</a>' % (l, n)
                          for n, l, _ in instance.social_links])
    social_links.allow_tags = True