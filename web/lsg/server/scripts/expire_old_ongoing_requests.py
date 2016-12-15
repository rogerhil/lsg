from django.conf import settings

from scripts.base import BaseScript
from request.models import SwapRequest


class ExpireOldOngoingRequests(BaseScript):
    name = 'expire_old_ongoing_requests'

    def expire(self):
        count = SwapRequest.expire_old_ongoing_requests()
        count += SwapRequest.expire_old_finalizing_requests()
        if count:
            msg = '%s ongoing requests older than %s days has been expired.'\
                  % (count, settings.EXPIRE_OLD_ONGOING_REQUESTS_IN_DAYS)
            self.logger.info(msg)
        else:
            msg = 'There is no ongoing requests older than %s days.' % \
                  settings.EXPIRE_OLD_ONGOING_REQUESTS_IN_DAYS
            self.logger.info(msg)

    def main(self):
        self.expire()


if __name__ == '__main__':
    script = ExpireOldOngoingRequests()
    script.run_from_cli()
