"""
## Flow ##
##########

Incoming requests
#################

+---------+             +----------+                 +------------+
| Pending | ==accept==> | ongoing | ==finalize1===> | Finalizing |
+---------+             +----------+                 +------------+
     ||                                                    ||
   refuse                                               finalize2
     ||                                                    ||
     \/                                                    \/      +---------+
 +---------+                                               |------ | Success |
 | Refused |                                               |       +---------+
 +---------+                                               |  (it was swapped!)
                                                           |
                                                       +--------+
                                                       | Failed |
                                                       +--------+
                                                      (not swapped,
                                                     or backed down)


My requests
###########

+---------+             +-----------+
| Pending | ==cancel==> | Cancelled |
+---------+             +-----------+

                                                            +---------+
                                                            | Success |
                                                            +---------+
+----------+                +------------+                 / (swapped!)
| ongoing | ==finalize1==> | Finalizing | ===finalize2===>
+----------+                +------------+                 \
                                                            +--------+
                                                            | Failed |
                                                            +--------+
                                                           (not swapped,
                                                          or backed down)


ongoing Status Scenarios
#########################

* Success scenario 1
                      +------------+
  User1 ==finalize==> | Finalizing | (requeste(d|r)_swapped=True)
  ˆˆˆˆˆ               +------------+
                      +---------+
  User2 ==finalize==> | Success | (requeste(d|r)_swapped=True)
  ˆˆˆˆˆ               +---------+

* Failed scenario 1 (both say that the swap didn't succeed)

                      +------------+
  User1 ==finalize==> | Finalizing | (requeste(d|r)_swapped=False)
  ˆˆˆˆˆ               +------------+
                      +--------+
  User2 ==finalize==> | Failed |  (requeste(d|r)_swapped=False)
  ˆˆˆˆˆ               +--------+

* Failed scenario 2 (User1 says didn't swap but User2 says it did)

                      +------------+
  User1 ==finalize==> | Finalizing | (requeste(d|r)_swapped=False)
  ˆˆˆˆˆ               +------------+
                      +--------+
  User2 ==finalize==> | Failed |  (requeste(d|r)_swapped=True)
  ˆˆˆˆˆ               +--------+

* Failed scenario 3 (User1 says it did swap but User2 says it didn't)

                      +------------+
  User1 ==finalize==> | Finalizing | (requeste(d|r)_swapped=True)
  ˆˆˆˆˆ               +------------+
                      +--------+
  User2 ==finalize==> | Failed |  (requeste(d|r)_swapped=False)
  ˆˆˆˆˆ               +--------+


SOME NOTES:

# Incomming requests

*Pending ==accept==> ongoing

After accept:
 - show modal with a small form to provide the condition data.
 - after submmiting the above form, show the contact details page with a
   congrats title.
 - don't show the "Finalize" button immediately (after some hours maybe)
 - new modal to see contact details, including google maps

*Pending ==refuse==> Refused

After refuse:
  - show archive icon
  - (find a way to mark that match as "refused before")

# My Requests

*Pending ==cancel==> Cancelled

After cancel:
  - show archive icon



# ongoing requests

*ongoing ==finalize1==> Closing

After finalize1:
 - show new modal with a form:
     - swapped: bool (default true)
     - notes to the other swapper: char
     - feedback: -1, 0, 1

*Finalizing ==finalize2==> Success/Failed

After finalize2:
  - show new modal with a form:
     - MAYBE show swapped info about the previous finalize1 (check ML, or ebay)
     - swapped: bool (default true)
     - notes to the other swapper: char
     - feedback: -1, 0, 1
  - Show new button to archive
  - if success or FULL failed (both marked as not swapped):
      - MAYBE swap games from the "games collection list" with weight 1.
      - OR MAYBE just delete from the "games collection list" for now.
   - if failed but 1 marked as swapped (edge case):
      - ?don't know what to do yet?


"""

from utils import Choices


class Status(Choices):
    pending = 1   # =accept> ongoing  OR =refuse> refused OR =cancel> Cancelled
    cancelled = 2   # .
    ongoing = 3     # =finalize1> Finalizing
    refused = 4     # .
    finalizing = 5  # =finalize2> Success or Failed
    succeeded = 6   # .
    failed = 7      # .
    expired = 8   # .

    @classmethod
    def open_statuses(cls):
        return [cls.pending, cls.ongoing, cls.finalizing]

    @classmethod
    def closed_statuses(cls):
        return [cls.cancelled, cls.refused, cls.succeeded, cls.failed,
                cls.expired]

    @classmethod
    def finalized_statuses(cls):
        return [cls.succeeded, cls.failed]

    @classmethod
    def to_dict(cls):
        data = dict([(j, i) for i, j in cls.raw_choices()])
        data['open_statuses'] = cls.open_statuses()
        data['closed_statuses'] = cls.closed_statuses()
        data['finalized_statuses'] = cls.finalized_statuses()
        return data


class RequestFlow(object):
    # below possible next states
    initial = (Status.pending,)  # There's no status initial (before create)
    pending = (Status.ongoing, Status.refused, Status.cancelled)
    cancelled = ()
    ongoing = (Status.finalizing, Status.expired)
    refused = ()
    finalizing = (Status.succeeded, Status.failed)  # timeout????
    succeeded = ()
    failed = ()
    expired = ()

    @classmethod
    def can_change_status_to(cls, request, status):
        if request is None:  # it means not created
            return status in cls.initial
        return status in getattr(cls, Status.attr(request.status))

    @classmethod
    def validate_change_status_to(cls, request, status):
        if request and request.status == status:
            return
        if not cls.can_change_status_to(request, status):
            st1 = Status.display(request.status)
            st2 = Status.display(status)
            raise StatusException('Cannot change status from %s to %s.' %
                                  (st1, st2), status)

    @classmethod
    def validate_finalizing_request(cls, request):
        requester_swapped_filled = request.requester_swapped is not None
        requested_swapped_filled = request.requested_swapped is not None
        swapped_list = [requester_swapped_filled, requested_swapped_filled]
        if request.is_finalizing:
            try:
                assert any(swapped_list) and not all(swapped_list)
            except AssertionError:
                raise StatusException("A SwapRequest in finalizing state must "
                                      "have at least one and only one of the "
                                      "following fields filled in: "
                                      "requester_swapped, requested_swapped")
        elif request.is_finalized:
            try:
                assert all(swapped_list)
            except AssertionError:
                raise StatusException("A SwapRequest in finalized state "
                                      "(success or failed) must have all of "
                                      "the following fields filled in: "
                                      "requester_swapped, requested_swapped")
        elif request.is_closed:
            try:
                if request.is_expired:
                    assert not any(swapped_list) or not all(swapped_list)
                else:
                    assert not any(swapped_list)
            except AssertionError:
                raise StatusException("A closed SwapRequest state cannot "
                                      "have any of the following fields "
                                      "filled in: requester_swapped, "
                                      "requested_swapped. Unless it is "
                                      "expired.")

    @classmethod
    def get_final_status(cls, request):
        if request.requester_swapped and request.requested_swapped:
            return Status.succeeded
        else:
            return Status.failed


class StatusMethodsMixin(object):
    """ Abstract class
    """

    @property
    def status_display(self):
        return Status.display(self.status)

    @property
    def status_history_display(self):
        status_history = self.status_history or []
        dt = lambda t: "%s %s" % (t.split('T')[0],
                                  ':'.join(t.split('T')[1].split(':')[:2]))
        return " => ".join(["%s at %s" % (Status.display(s['status']),
                                          dt(s['datetime']))
                            for s in status_history])

    @property
    def previous_status(self):
        status_history = self.status_history or []
        if len(status_history) > 1:
            return status_history[-2]['status']

    @property
    def previous_status_display(self):
        previous_status = self.previous_status
        if previous_status:
            return Status.display(previous_status)

    @property
    def is_pending(self):
        return self.status == Status.pending

    @property
    def is_ongoing(self):
        return self.status == Status.ongoing

    @property
    def is_refused(self):
        return self.status == Status.refused

    @property
    def is_cancelled(self):
        return self.status == Status.cancelled

    @property
    def is_failed(self):
        return self.status == Status.failed

    @property
    def is_succeeded(self):
        return self.status == Status.succeeded

    @property
    def is_expired(self):
        return self.status == Status.expired

    @property
    def is_finalizing(self):
        return self.status == Status.finalizing

    @property
    def is_closed(self):
        return self.status in Status.closed_statuses()

    @property
    def is_finalized(self):
        return self.status in Status.finalized_statuses()


class StatusException(Exception, StatusMethodsMixin):

    def __init__(self, message, status=None):
        super(StatusException, self).__init__(message)
        self.status = status
        self.args = (message, status)

    def __str__(self):
        return str(self.args[0])
