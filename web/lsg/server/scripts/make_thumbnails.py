import os
from PIL import Image

from scripts.base import BaseScript

URL_FETCH_TIME_LIMIT = 10  # seconds

MAX_WIDTH = 85
MAX_HEIGHT = 98


class ThumbnailsMaker(BaseScript):
    name = 'make_thumbnails'

    def make_thumbnail(self, infile, outfile, max_width, max_height):
        if not infile.lower().strip().endswith('jpg') and not \
           infile.lower().strip().endswith('jpeg'):
            self.logger.info(' ##### NEW file extension: %s' % infile)
        try:
            im = Image.open(infile)
        except IOError as err:
            self.logger.error("ERROR! Unable to open the image %s: %s" %
                              (infile, err))
            return
        width, height = im.size
        ratio = min(max_width / width, max_height / height)
        new_size = (width * ratio, height * ratio)
        if infile != outfile:
            try:
                im.thumbnail(new_size, Image.ANTIALIAS)
                im.save(outfile, "JPEG")
            except IOError as err:
                self.logger.error("ERROR! Unable to create thumbnail for '%s'"
                                  ": %s" % (infile, err))

    def make_all_thumbnails(self, sizes, update=False):
        count = 0
        for platform in os.listdir(self.images_path):
            platform_dir = os.path.join(self.images_path, platform)
            if not os.path.isdir(platform_dir):
                continue
            self.logger.info("Making thumbnails for platform: %s " % platform)
            for subdir in os.listdir(platform_dir):
                subdir = os.path.join(platform_dir, subdir)
                if not os.path.isdir(subdir):
                    continue
                for img in os.listdir(subdir):
                    if not os.path.splitext(img)[0].endswith('thumb'):
                        continue
                    infile = os.path.join(subdir, img)
                    for sufix, max_width, min_width in sizes:
                        outfile = "%s_%s.jpg" % (os.path.splitext(infile)[0],
                                                 sufix)
                        if not update and os.path.isfile(outfile):
                            continue
                        self.make_thumbnail(infile, outfile, max_width,
                                            min_width)
                        count += 1
                        if count % 200 == 0:
                            self.logger.info("%s: built %s thumbnails so far" %
                                             (platform, count))

    def main(self):
        sizes = [
            # ('small', MAX_WIDTH, MAX_HEIGHT),
            ('medium', MAX_WIDTH * 2, MAX_HEIGHT * 2),
        ]
        self.make_all_thumbnails(sizes, update=False)


if __name__ == '__main__':
    script = ThumbnailsMaker()
    script.run_from_cli()
