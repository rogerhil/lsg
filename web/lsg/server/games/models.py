from django.db import models

from pg_fts.fields import TSVectorField

from games.images import LocalGameImages

PLATFORM_SHORT_NAMES = {
    'Sony Playstation': 'Playstation',
    'Sony Playstation 2': 'PS2',
    'Sony Playstation 3': 'PS3',
    'Sony Playstation 4': 'PS4',
    'Sony Playstation 5': 'PS5',
    'Microsoft Xbox': 'Xbox',
    'Microsoft Xbox 360': 'Xbox 360',
    'Microsoft Xbox One': 'Xbox One',
    'Nintendo 3DS': '3DS',
    'Nintendo DS': 'DS',
    'Nintendo Wii U': 'Wii U',
    'Nintendo Wii': 'Wii',
    'Nintendo Game Boy': 'Game Boy',
    'Nintendo Game Boy Advance': 'Game Boy Advance',
    'Nintendo Game Boy Color': 'Game Boy Color',
    'Nintendo GameCube': 'GameCube',
    'Sony Playstation Vita': 'PS Vita',
    'Sony PSP': 'PSP',
    'Nintendo Entertainment System (NES)': 'NES',
    'Super Nintendo (SNES)': 'SNES',
}


class Platform(models.Model):
    api_id = models.IntegerField(unique=True)
    name = models.CharField(max_length=255, unique=True)
    overview = models.TextField(null=True, blank=True)
    console = models.CharField(max_length=128, null=True, blank=True)
    controller = models.CharField(max_length=128, null=True, blank=True)
    developer = models.CharField(max_length=128, null=True, blank=True)
    cpu = models.CharField(max_length=255, null=True, blank=True)
    memory = models.CharField(max_length=255, null=True, blank=True)
    graphics = models.CharField(max_length=255, null=True, blank=True)
    sound = models.CharField(max_length=255, null=True, blank=True)
    display = models.CharField(max_length=255, null=True, blank=True)
    media = models.CharField(max_length=128, null=True, blank=True)
    max_controllers = models.PositiveIntegerField(null=True, blank=True)
    api_rating = models.DecimalField(max_digits=5, decimal_places=2, null=True,
                                     blank=True)

    def __str__(self):
        return self.name

    def __eq__(self, other):
        if not other:
            return False
        return self.api_id == other.api_id

    @property
    def short_name(self):
        return PLATFORM_SHORT_NAMES.get(self.name, self.name)

    @property
    def logo_image(self):
        return '/app/app/img/logos/square/40x40/%s.png' % self.api_id

    @property
    def logo_image_horizontal(self):
        return '/app/app/img/logos/horizontal/150x25/%s.png' % self.api_id

    @property
    def logo_image_vertical(self):
        return '/app/app/img/logos/vertical/25x150/%s.png' % self.api_id


class Genre(models.Model):
    name = models.CharField(max_length=64)


all_platforms = Platform.objects.all()
get_platform = lambda id: dict([(p.id, p) for p in all_platforms])[id]


class Game(models.Model):
    api_id = models.IntegerField(unique=True)
    name = models.CharField(max_length=255, db_index=True)
    platform = models.ForeignKey(Platform, db_index=True)
    release = models.DateField(null=True, blank=True)
    overview = models.TextField(null=True, blank=True)
    players = models.PositiveIntegerField(null=True, blank=True)
    co_op = models.BooleanField(default=False)
    youtube = models.CharField(max_length=128, null=True, blank=True)
    esrb = models.CharField(max_length=255, null=True, blank=True)
    developer = models.CharField(max_length=128, null=True, blank=True)
    publisher = models.CharField(max_length=128, null=True, blank=True)
    api_rating = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    similar_count = models.IntegerField(default=0)
    similar = models.ManyToManyField('Game',
                                     related_name='same_game_other_platform')
    similar_same_platform = models.ManyToManyField('Game',
                                                   related_name='similar_game_same_platform')
    similar_same_platform_ids = models.CharField(max_length=2048, null=True, blank=True)

    wanted_count = models.IntegerField(default=0)
    owned_count = models.IntegerField(default=0)

    genres = models.ManyToManyField(Genre)

    fts = TSVectorField(fields=(('name', 'A'),), dictionary='english')

    class Meta:
        index_together = ('name', 'platform')

    def __init__(self, *args, **kwargs):
        super(Game, self).__init__(*args, **kwargs)
        self.images = LocalGameImages(self)

    def __str__(self):
        return self.full_name

    def __hash__(self):
        return self.id

    @property
    def full_name(self):
        return "%s (%s)" % (self.name, self.platform.short_name)

    @property
    def similar_same_platform_ids_list(self):
        ids = self.similar_same_platform_ids
        return list(map(int, ids.split(',') if ids else []))
