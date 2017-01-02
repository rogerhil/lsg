import os
from PIL import Image

from scripts.base import BaseScript

URL_FETCH_TIME_LIMIT = 10  # seconds

MAX_WIDTH_SMALL = 200
MAX_HEIGHT_SMALL = 100

MAX_WIDTH_MEDIUM = 340
MAX_HEIGHT_MEDIUM = 170

MAX_WIDTH_BIG = 600
MAX_HEIGHT_BIG = 300


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
        new_size = (int(width * ratio), int(height * ratio))
        if new_size[0] >= width or new_size[1] >= height:
            self.logger.warning("New size is bigger, it will consider the small size: "
                                "%s > %sx%s" % (new_size, width, height))
            new_size = (width, height)
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
                    if not os.path.splitext(img)[0].endswith('front'):
                        continue
                    infile = os.path.join(subdir, img)
                    for sufix, max_width, min_width in sizes:
                        outfile = "%s%s.jpg" % (os.path.splitext(infile)[0],
                                                 sufix)
                        # if not "sufix", the image will be resized anyway, to reduce the size
                        # of the original image, usually is too big.
                        if not update and os.path.isfile(outfile) and sufix:
                            continue
                        self.make_thumbnail(infile, outfile, max_width, min_width)
                        count += 1
                        if count % 200 == 0:
                            self.logger.info("%s: built %s thumbnails so far" %
                                             (platform, count))

    def main(self):
        sizes = [
            ('_small', MAX_WIDTH_SMALL, MAX_HEIGHT_SMALL),
            ('_medium', MAX_WIDTH_MEDIUM, MAX_HEIGHT_MEDIUM),
            ('', MAX_WIDTH_BIG, MAX_HEIGHT_BIG),  # to replace the original with a small size
        ]
        self.make_all_thumbnails(sizes, update=False)


if __name__ == '__main__':
    script = ThumbnailsMaker()
    script.run_from_cli()
