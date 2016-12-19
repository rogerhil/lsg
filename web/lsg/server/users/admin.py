from django.contrib import admin

from users.models import User, UserReport, CollectionItem, WishlistItem


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name',
                    'address', 'date_joined', 'social_links', 'enabled', 'app_updates',
                    'accepted_terms')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    list_filter = ('deleted', 'enabled', 'reported', 'app_updates', 'accepted_terms')

    def social_links(self, instance):
        return ', '.join(['<a href="%s" target="_blank">%s</a>' % (l, n)
                          for n, l, _ in instance.social_links])
    social_links.allow_tags = True


@admin.register(UserReport)
class UserReport(admin.ModelAdmin):
    list_display = ('reported', 'reporter', 'created', 'message')
    search_fields = ('reported__first_name', 'reported__last_name', 'reported__email',
                     'reporter__first_name', 'reporter__last_name', 'reporter__email',
                     'message')


@admin.register(CollectionItem)
class CollectionItem(admin.ModelAdmin):
    list_display = ('user', 'game')
    search_fields = ('user__first_name', 'user__last_name', 'user__email',
                     'game__name', 'game__platform__name')


@admin.register(WishlistItem)
class WishlistItem(admin.ModelAdmin):
    list_display = ('user', 'game')
    search_fields = ('user__first_name', 'user__last_name', 'user__email',
                     'game__name', 'game__platform__name')
