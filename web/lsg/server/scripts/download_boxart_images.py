import os
import sys
import traceback

from eventlet import GreenPool
from urllib.error import HTTPError
from thegamesdb.test.mockdb import MockException

from scripts.base import BaseScript
from django.conf import settings
from games.images import LocalGameImages

URL_FETCH_TIME_LIMIT = 10  # seconds


class BoxartDownloader(BaseScript):
    name = "download_boxart_images"

    image_kinds = ['front', 'front_thumb', 'back', 'back_thumb']

    def download_and_save(self, game, fpath, url, override=False):
        if url is None:
            self.logger.error("Image url for game %s (#%s) not found!" % (game, game.id))
            return
        extension = url.split('.')[-1].lower()
        different_fpath = None
        if extension not in ['jpeg', 'jpg']:
            different_fpath = fpath.replace('.jpg', '.%s' % extension)
        if (os.path.isfile(fpath) or
            (different_fpath and os.path.isfile(different_fpath))) \
           and not override:
            return
        if different_fpath:
            self.logger.warn("NO JPEG, %s instead: %s" % (extension.upper(),
                                                          url))

        try:
            image_data = self.api._get_response(url)
        except HTTPError as err:
            self.logger.error("HTTPError: %s - %s" % (url, err))
            return

        if different_fpath:
            self.logger.warn('Saving %s: %s' % (extension, different_fpath))
            with open(different_fpath, "wb") as fd:
                fd.write(image_data)
        else:
            with open(fpath, "wb") as fd:
                fd.write(image_data)

    def download_image(self, game, platform, override=False):
        fp = lambda p: os.path.abspath(os.path.join(self.parent_path,
                                                    p.strip().strip('/')))
        subpath = fp(LocalGameImages.get_path_by_platform_api_id(platform,
                                                                 game.id))
        method = getattr(LocalGameImages, 'get_front_path')
        path = fp(method(platform, game.id))
        if not os.path.isdir(subpath):
            os.makedirs(subpath)

        url = None
        for kind in self.image_kinds:
            url = getattr(game, 'boxart_%s' % kind)
            if url:
                break
        self.download_and_save(game, path, url, override)

    def main(self):
        pool = GreenPool(20)

        def download_and_save(i, game, platform):
            if i % 50 == 0:
                self.logger.debug("%s: %s remaining" % (platform, length - i))
            try:
                self.download_image(game, platform.name)
            except MockException as err:
                self.logger.error(" MOCK ERROR!!!!  %s" % err)
            except Exception as err:
                self.logger.error(" Generic error %s" % str(err))
                self.logger.error(" Traceback: %s" % traceback.format_exc())
                #self.logger.error(" Error: %s" % sys.exc_info()[0])

        for platform in self.mocked_api.platform.list():
            if platform.name not in settings.SUPPORTED_PLATFORMS:
                continue
            self.logger.info(" *** Download boxart images for %s" % platform)
            games = platform.games()
            length = len(games)
            for i, game in enumerate(games):
                pool.spawn(download_and_save, i, game, platform)
            self.logger.info('---' * 20)

        pool.waitall()

if __name__ == '__main__':
    script = BoxartDownloader()
    script.run_from_cli()
