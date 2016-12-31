import os
from thegamesdb.test.mockdb import TheGamesDbMock

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class BaseGameImages(object):

    def __init__(self, *args, **kwargs):
        pass

    @property
    def front(self):
        raise NotImplementedError

    @property
    def back(self):
        raise NotImplementedError

    @property
    def front_thumb(self):
        raise NotImplementedError

    @property
    def back_thumb(self):
        raise NotImplementedError

    @property
    def front_thumb_small(self):
        return self.front_thumb

    @property
    def back_thumb_small(self):
        return self.back_thumb

    @property
    def front_thumb_medium(self):
        return self.front_thumb

    @property
    def back_thumb_medium(self):
        return self.back_thumb


class ApiGameImages(BaseGameImages):

    xml_path = os.path.join(BASE_DIR, 'scripts/xml')

    def __init__(self, api_id):
        self.api_id = api_id
        self._game = None
        self.api = TheGamesDbMock(self.xml_path)

    @property
    def game(self):
        if self._game is None:
            self._game = self.api.game.get(self.api_id)
        return self._game

    @property
    def front(self):
        return self.game.boxart_front

    @property
    def back(self):
        return self.game.boxart_back

    @property
    def front_thumb(self):
        return self.game.boxart_front_thumb

    @property
    def back_thumb(self):
        return self.game.boxart_back_thumb


class LocalGameImages(BaseGameImages):

    max_files_per_dir = 1000
    base_path = '/media/img/games'

    def __init__(self, game):
        self.game = game

    @classmethod
    def get_path_by_platform_api_id(cls, platform, api_id):
        platform = cls.alias(platform)
        subdir = str(int(int(api_id) / (cls.max_files_per_dir + 1))).zfill(4)
        return os.path.join(cls.base_path, platform, subdir)

    @classmethod
    def alias(cls, name):
        return name.lower().replace(' ', '-')\
                           .replace('(', '')\
                           .replace(')', '')

    @classmethod
    def get_front_path(cls, platform, api_id, sufix=""):
        platform = cls.alias(platform)
        path = cls.get_path_by_platform_api_id(platform, api_id)
        return "%s/%s_front%s.jpg" % (path, api_id, sufix)

    @classmethod
    def get_back_path(cls, platform, api_id, sufix=""):
        platform = cls.alias(platform)
        path = cls.get_path_by_platform_api_id(platform, api_id)
        return "%s/%s_back%s.jpg" % (path, api_id, sufix)

    @classmethod
    def get_front_thumb_path(cls, platform, api_id, sufix=""):
        return cls.get_front_path(platform, api_id, sufix)
        #return cls.get_front_path(platform, api_id, "_thumb%s" % sufix)

    @classmethod
    def get_back_thumb_path(cls, platform, api_id, sufix=""):
        return cls.get_back_path(platform, api_id, sufix)

    @property
    def front(self):
        return self.get_front_path(self.game.platform.name, self.game.api_id)

    @property
    def back(self):
        return self.get_back_path(self.game.platform.name, self.game.api_id)

    @property
    def front_thumb(self):
        return self.get_front_thumb_path(self.game.platform.name,
                                         self.game.api_id)

    @property
    def back_thumb(self):
        return self.get_back_thumb_path(self.game.platform.name,
                                        self.game.api_id)

    @property
    def front_thumb_small(self):
        return self.get_front_thumb_path(self.game.platform.name,
                                         self.game.api_id, "_small")

    @property
    def back_thumb_small(self):
        return self.get_back_thumb_path(self.game.platform.name,
                                        self.game.api_id, "_small")

    @property
    def front_thumb_medium(self):
        return self.get_front_thumb_path(self.game.platform.name,
                                         self.game.api_id, "_medium")

    @property
    def back_thumb_medium(self):
        return self.get_back_thumb_path(self.game.platform.name,
                                        self.game.api_id, "_medium")
