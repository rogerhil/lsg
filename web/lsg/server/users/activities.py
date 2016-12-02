from actstream import action


class Verb(object):

    def __init__(self, sentence, css_class='fa fa-question', color='text-gray-darker'):
        self.sentence = sentence
        self.name = None
        self.css_class = css_class
        self.color = color

    def __str__(self):
        if self.name is None:
            raise Exception('name must be defined!')
        return self.name

    def parse(self, stream_item, user, use_cache=False):
        if use_cache:
            target, actor = Verbs.fetch_cached_data(stream_item)
        else:
            target, actor = stream_item.target, stream_item.actor
        context = {
            'actor': actor,
            'verb': stream_item.verb.capitalize(),
            'action_object': stream_item.action_object,
            'target': target,
            'timesince': stream_item.timesince()
        }
        context.update(self.extra_context(stream_item, user, use_cache))
        return self.sentence % context

    def extra_context(self, stream_item, user, use_cache=False):
        return dict()

    def send(self, actor, target=None, action_object=None):
        if self.name is None:
            raise Exception('name must be defined!')
        action.send(actor, verb=self.name, target=target, action_object=action_object)


class SRVerb(Verb):

    def extra_context(self, stream_item, user, use_cache=False):
        target, actor = Verbs.fetch_cached_data(stream_item)
        requester = Verbs.fetch_cached_extra(target, 'requester', 'user')
        requested = Verbs.fetch_cached_extra(target, 'requested', 'user')
        requester_game = Verbs.fetch_cached_extra(target, 'requester_game', 'game')
        requested_game = Verbs.fetch_cached_extra(target, 'requested_game', 'game')
        requester_game.platform = Verbs.fetch_cached_extra(requester_game, 'platform')
        requested_game.platform = Verbs.fetch_cached_extra(requested_game, 'platform')
        if requester == user:
            other_user = requested
            iwish = requested_game
            my_game = requester_game
            swapped = 'swapped' if target.requester_swapped else 'not swapped'
        else:
            other_user = requester
            iwish = requester_game
            my_game = requested_game
            swapped = 'swapped' if target.requested_swapped else 'not swapped'
        context = dict(
            user=other_user,
            iwish=iwish,
            my_game=my_game,
            swapped=swapped
        )
        return context


class MetaVerbs(type):
    defaults = ['default', 'target_default', 'action_default']

    def __new__(mcs, name, bases, attrs):
        for key in attrs.keys():
            if key in mcs.defaults:
                continue
            if isinstance(attrs[key], Verb):
                attrs[key].name = key
        return super().__new__(mcs, name, bases, attrs)


class Verbs(metaclass=MetaVerbs):

    target_cache = {}
    actor_cache = {}
    extra_cache = {}

    cancelled = SRVerb('Cancelled request: %(iwish)s X %(my_game)s',
                       'fa fa-close', 'text-purple')
    requested = SRVerb('Requested %(user)s to swap %(iwish)s with mine %(my_game)s',
                       'fa fa-hand-o-up', 'text-info')
    accepted = SRVerb('Accepted %(user)s\'s request to swap %(iwish)s with mine %(my_game)s',
                      'fa fa-thumbs-up', 'text-success')
    refused = SRVerb('Refused %(user)s\'s request to swap %(iwish)s with mine %(my_game)s',
                     'fa fa-thumbs-down', 'text-danger')
    finalized = SRVerb('Finalized request to swap %(iwish)s with mine %(my_game)s as %(swapped)s',
                       'fa fa-power-off', 'text-black')
    archived = SRVerb('Archived request: %(iwish)s X %(my_game)s',
                      'fa fa-archive', 'text-gray-dark')
    archived_all = Verb('Archived all swap requests',
                        'fa fa-archive', 'text-gray-dark')
    changed_profile_picture = Verb('Change profile picture', 'fa fa-user', 'text-warning')
    changed_profile_details = Verb('Change profile details', 'fa fa-user', 'text-primary')
    added_to_collection = Verb('Added game "%(target)s" to collection',
                               'fa fa-gamepad', 'text-success')
    removed_from_collection = Verb('Removed game "%(target)s" from collection',
                                   'fa fa-gamepad', 'text-danger')
    added_to_wishlist = Verb('Added game "%(target)s" to wish list',
                             'fa fa-heart', 'text-success')
    removed_from_wishlist = Verb('Removed game "%(target)s" from wish list',
                                 'fa fa-heart', 'text-danger')

    # defaults
    target_default = Verb('%(verb)s %(target)s')
    action_default = Verb('%(verb)s %(action_object)s')
    default = Verb('%(verb)s')

    @classmethod
    def clear_cache(cls):
        cls.target_cache = {}
        cls.actor_cache = {}
        cls.extra_cache = {}

    @classmethod
    def fetch_cached_data(cls, stream_item):
        target_key = "%s_%s" % (stream_item.target_content_type_id, stream_item.target_object_id)
        if target_key not in Verbs.target_cache:
            cls.target_cache[target_key] = stream_item.target
        actor_key = "%s_%s" % (stream_item.actor_content_type_id, stream_item.actor_object_id)
        if actor_key not in Verbs.actor_cache:
            cls.actor_cache[actor_key] = stream_item.actor
        return cls.target_cache[target_key], cls.actor_cache[actor_key]

    @classmethod
    def fetch_cached_extra(cls, obj, attr, key=None):
        obj_id = getattr(obj, "%s_id" % attr)
        if key:
            extra_key = "%s_%s" % (key, obj_id)
        else:
            extra_key = "%s_%s_%s" % (obj.__class__.__name__, attr, obj_id)
        if extra_key not in Verbs.extra_cache:
            cls.extra_cache[extra_key] = getattr(obj, attr)
        return cls.extra_cache[extra_key]

    @classmethod
    def get(cls, item):
        if hasattr(cls, item.verb):
            return getattr(cls, item.verb)
        if item.target:
            return cls.target_default
        elif item.action_object:
            return cls.action_default
        else:
            return cls.default

    @classmethod
    def items(cls):
        items = dict()
        for key, item in cls.__dict__.items():
            if isinstance(item, Verb):
                items[key] = item
        return items
