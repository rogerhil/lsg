
from django.utils import timezone
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from request.models import SwapRequest, Feedback
from request.flow import RequestFlow, Status, StatusException


@receiver(pre_save, sender=SwapRequest)
def validate_status_change(sender, instance=None, **kwargs):
    swap_request = instance
    if swap_request.id:
        old_instance = sender.objects.get(id=swap_request.id)
        RequestFlow.validate_change_status_to(old_instance,
                                              swap_request.status)
        RequestFlow.validate_finalizing_request(swap_request)
    else:
        default = sender._meta.get_field('status').default
        RequestFlow.validate_change_status_to(None, default)


@receiver(pre_save, sender=SwapRequest)
def refuse_similar_pending_requests(sender, instance=None, **kwargs):
    swap_request = instance
    if not swap_request.id:
        return
    old_swap_request = sender.objects.get(id=swap_request.id)
    # the status is changing from Pending to Ongoing it means that the
    # "requested" accepted the SwapRequest.
    if old_swap_request.is_pending and swap_request.is_ongoing:
        # in this case, get all similar SwapRequests
        similars = swap_request.get_similar_requests_for_the_requested(True)
        # refuse others similar requests for the same game
        print("Current request: %s" % swap_request)
        for other_swap_request in similars:
            print("Refusing: %s" % other_swap_request)
            other_swap_request.refuse(automatically_refused=True)
            other_swap_request.save()


@receiver(pre_save, sender=SwapRequest)
def update_status_history(sender, instance=None, **kwargs):
    swap_request = instance
    now = timezone.now().isoformat()
    if not swap_request.id:
        swap_request.status_history = [dict(status=Status.pending,
                                            datetime=now)]
        return
    old_swap_request = sender.objects.get(id=swap_request.id)
    if old_swap_request.status != swap_request.status:
        if swap_request.status_history is None:
            swap_request.status_history = []
        swap_request.status_history.append(dict(status=swap_request.status,
                                                datetime=now))


@receiver(pre_save, sender=SwapRequest)
def check_unique_requests(sender, instance=None, **kwargs):
    swap_request = instance
    statuses = [Status.ongoing, Status.finalizing]
    if swap_request.id:
        return
    msg = 'Can\'t create a request as there is already an ' \
          'ongoing/finalizing request involving the game "%s".'
    count = SwapRequest.objects.filter(
        requester=swap_request.requester,
        requester_game=swap_request.requester_game,
        status__in=statuses
    ).count()
    if count:
        raise StatusException(msg % swap_request.requester_game)

    count = SwapRequest.objects.filter(
        requested=swap_request.requested,
        requested_game=swap_request.requested_game,
        status__in=statuses
    ).count()
    if count:
        raise StatusException(msg % swap_request.requested_game)

    count = SwapRequest.objects.filter(
        requester=swap_request.requester,
        requester_game=swap_request.requester_game,
        requested=swap_request.requested,
        requested_game=swap_request.requested_game,
        status=Status.pending
    ).count()

    if count:
        raise StatusException('Can\'t create a request as there is already a '
                              'pending request involving the game "%s".' %
                              swap_request.requester_game)
