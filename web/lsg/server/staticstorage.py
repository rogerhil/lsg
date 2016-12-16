import os
import posixpath
from django.utils.six.moves.urllib.parse import (
    unquote, urldefrag, urlsplit, urlunsplit,
)
from django.conf import settings
from django.contrib.staticfiles.storage import ManifestStaticFilesStorage


class LsgManifestStaticFilesStorage(ManifestStaticFilesStorage):

    patterns = tuple(list(ManifestStaticFilesStorage.patterns) + [
        ("index.html", (
            (r"""<script\s+(src=['"]{1}(.*?)['"]{1})""", '<script src="%s"'),
            (r"""<link\s+rel="stylesheet"\s+(href=['"]{1}(.*?\.css)['"]{1})""",
             '<link rel="stylesheet" href="%s"'),
            (r"""<link\s+rel="shortcut icon"\s+(href=['"]{1}(.*?"""
             """\.(?:ico|png|jpg|jpeg|gif))['"]{1})""",
             '<link rel="shortcut icon" href="%s"'),
            (r"""<meta\s+property="og:image"\s+(content=['"]{1}(.*?"""
             """\.(?:ico|png|jpg|jpeg|gif))['"]{1})""",
             '<meta property="og:image" content="%s"'),
        )),
    ])

    site = 'https://www.letswapgames.com'
    prefixes = [settings.STATIC_URL, 'app/', 'vendor/', site]

    def url_startswith(self, url):
        for prefix in self.prefixes:
            if url.startswith(prefix):
                return prefix

    def hashed_name(self, name, content=None):
        if name == 'index.html':
            return name
        result = super(LsgManifestStaticFilesStorage, self).hashed_name(name, content)
        return result

    def url_converter(self, name, template=None):
        """
        Return the custom URL converter for the given file name.
        """
        if template is None:
            template = self.default_template

        def converter(matchobj):
            """
            Convert the matched URL to a normalized and hashed URL.

            This requires figuring out which files the matched URL resolves
            to and calling the url() method of the storage.
            """
            matched, url = matchobj.groups()

            # Ignore absolute/protocol-relative, fragments and data-uri URLs.
            if url.startswith(('http:', 'https:', '//', '#', 'data:')):
                if not url.startswith(self.site):
                    return matched

            # Ignore absolute URLs that don't point to a static file (dynamic
            # CSS / JS?). Note that STATIC_URL cannot be empty.
            if url.startswith('/') and not self.url_startswith(url):
                return matched

            # Strip off the fragment so a path-like fragment won't interfere.
            url_path, fragment = urldefrag(url)

            if url_path.startswith('/'):
                # Otherwise the condition above would have returned prematurely.
                prefix = self.url_startswith(url_path)
                assert prefix
                target_name = url_path[len(settings.STATIC_URL):]
            else:
                # We're using the posixpath module to mix paths and URLs conveniently.
                source_name = name if os.sep == '/' else name.replace(os.sep, '/')
                target_name = posixpath.join(posixpath.dirname(source_name), url_path)

            # Determine the hashed name of the target file with the storage backend.
            if url_path.startswith(self.site):
                path = url_path.replace(self.site, '')[len(settings.STATIC_URL):]
                hashed_url = "%s%s" % (self.site, self.url(unquote(path), force=True))
            else:
                hashed_url = self.url(unquote(target_name), force=True)

            transformed_url = '/'.join(url_path.split('/')[:-1] + hashed_url.split('/')[-1:])

            # Restore the fragment that was stripped off earlier.
            if fragment:
                transformed_url += ('?#' if '?#' in url else '#') + fragment

            # Return the hashed version to the file
            return template % unquote(transformed_url)

        return converter
