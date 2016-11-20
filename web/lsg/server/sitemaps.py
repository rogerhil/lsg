from django.contrib.sitemaps import Sitemap
from django.core.urlresolvers import reverse


class HomeSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8

    def items(self):
        return ['landing-page', 'privacy-policy']

    def location(self, item):
        return reverse(item)
