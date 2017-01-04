(function() {
    'use strict';

    angular
        .module('app.requests')
        .service('RequestsService', RequestsService);

    RequestsService.$inject = ['$q', '$http', '$rootScope', '$state', '$timeout', 'GlobalFunctions'];
    function RequestsService($q, $http, $rootScope, $state, $timeout, GlobalFunctions) {

        var self = this;

        $rootScope.pollRequestsInterval = 10000;
        $rootScope.pollRequestsPromise = undefined;
        $rootScope.myRequests = [];
        $rootScope.incomingRequests = [];
        $rootScope.myOpenRequests = [];
        $rootScope.incomingOpenRequests = [];
        $rootScope.myOpenRequestsGamesIds = [];
        $rootScope.incomingOpenRequestsGamesIds = [];
        $rootScope.requestsIndicatorRead = true;

        $rootScope.markRequestsIndicatorAsRead = function () {
            $rootScope.requestsIndicatorRead = true;
        };

        self.highlightMy = false;
        self.highlightInc = false;

        function getBaseUrl(key) {
            var userId = $rootScope.user.id;
            var baseUrl = {
                myRequests: '/api/users/' + userId + '/my_requests/',
                incomingRequests: '/api/users/' + userId + '/incoming_requests/',
                requests: '/api/users/' + userId + '/requests/'
            };
            return baseUrl[key];
        }

        self.getBaseUrl = getBaseUrl;

        var Request = function (data) {
            for (var key in data) {
                this[key] = data[key];
            }
        };
        Request.prototype.isFinalizedByAuthenticatedUser = function () {
            var finalizing = this.isFinalizing() || this.isFinalized();
            var context;
            if (this.requester.id == $rootScope.user.id) {
                context = 'requester';
            } else {
                context = 'requested';
            }
            var userFinalized = this[context + '_swapped'] != null && this[context + '_swapped'] != undefined;
            return finalizing && userFinalized;
        };
        Request.prototype.isPending = function () {
            return this.status == $rootScope.Status.pending;
        };
        Request.prototype.isOngoing = function () {
            return this.status == $rootScope.Status.ongoing;
        };
        Request.prototype.isCancelled = function () {
            return this.status == $rootScope.Status.cancelled;
        };
        Request.prototype.isExpired = function () {
            return this.status == $rootScope.Status.expired;
        };
        Request.prototype.isRefused = function () {
            return this.status == $rootScope.Status.refused;
        };
        Request.prototype.isSucceeded = function () {
            return this.status == $rootScope.Status.succeeded;
        };
        Request.prototype.isArchived = function () {
            return this.status == $rootScope.Status.archived;
        };
        Request.prototype.isFinalizing = function () {
            return this.status == $rootScope.Status.finalizing;
        };
        Request.prototype.isOpen = function () {
            return $rootScope.Status.open_statuses.indexOf(this.status) != -1;
        };
        Request.prototype.isClosed = function () {
            return $rootScope.Status.closed_statuses.indexOf(this.status) != -1;
        };
        Request.prototype.isFinalized = function () {
            return $rootScope.Status.finalized_statuses.indexOf(this.status) != -1;
        };

        self.Request = Request;

        self.getMyRequests = function () {
            var q = $q.defer();
            $http
                .get(getBaseUrl('myRequests'))
                .success(function (response) {
                    var requests = response.results.map(function (o) {return new Request(o)});
                    q.resolve(requests);
                });
            return q.promise;
        };
        self.getIncomingRequests = function () {
            var q = $q.defer();
            $http
                .get(getBaseUrl('incomingRequests'))
                .success(function (response) {
                    var requests = response.results.map(function (o) {return new Request(o)});
                    q.resolve(requests);
                });
            return q.promise;
        };

        function highlightMenu () {
            if (self.highlightMy && self.highlightInc) {
                GlobalFunctions.highlight('.nav li[sref="app.requests"]');
                if ($state.current.name == 'app.requests') {
                    $rootScope.requestsIndicatorRead = true;
                } else {
                    $rootScope.requestsIndicatorRead = false;
                }
            }
        }

        function filterOpen(requests) {
            var f =  requests.filter(function (o) {
                return o.isOpen();
            });
            return f;
        }

        function allGamesIds(requests) {
            return requests.reduce(function (reduced, request) {
                var ids = [request.requester_game.id, request.requested_game.id];
                return reduced.concat(ids);
            }, []);
        }

        var loadMyRequests = function (callback) {
            self.getMyRequests().then(function (requests) {
                self.highlightMy = true;
                if (filterOpen(requests).length != $rootScope.myOpenRequests.length) {
                    highlightMenu();
                }
                $rootScope.myRequests = requests;
                $rootScope.myOpenRequests = filterOpen(requests);
                $rootScope.myOpenRequestsGamesIds = allGamesIds($rootScope.myOpenRequests);
                if (callback) {
                    callback(requests);
                }
            });
        };

        var loadIncomingRequests = function (callback) {
            self.getIncomingRequests().then(function (requests) {
                self.highlightInc = true;
                if (filterOpen(requests).length != $rootScope.incomingOpenRequests.length) {
                    highlightMenu();
                }
                $rootScope.incomingRequests = requests;
                $rootScope.incomingOpenRequests = filterOpen(requests);
                $rootScope.incomingOpenRequestsGamesIds = allGamesIds($rootScope.incomingOpenRequests);
                if (callback) {
                    callback(requests);
                }
            });
        };

        var loadAllRequests = function (callbackMy, callbackIncoming, preventOnDialog) {
            if ($state.current.name == 'app.requests') {
                $rootScope.requestsIndicatorRead = true;
            }
            if (!$rootScope.user.acceptedTerms()) {
                return;
            }
            if (!preventOnDialog || !$('md-dialog').length) {
                loadMyRequests(callbackMy);
                loadIncomingRequests(callbackIncoming);
            }
        };

        self.pollRequests = function (callbackMy, callbackIncoming, preventOnDialog) {
            self.highlightMy = false;
            self.highlightInc = false;
            loadAllRequests(callbackMy, callbackIncoming, preventOnDialog);
            $rootScope.pollRequestsPromise = $timeout(function () {
                self.pollRequests(callbackMy, callbackIncoming, true);
            }, $rootScope.pollRequestsInterval);
        };

        this.createSwapRequest = function (requested, requested_game,
                                           requester, requester_game,
                                           requester_game_condition_notes,
                                           distance) {
            var q = $q.defer();
            var data = {
                requested_id: requested,
                requested_game_id: requested_game,
                requester_id: requester,
                requester_game_id: requester_game,
                requester_game_condition_notes: requester_game_condition_notes,
                distance: distance
            };
            $http
                .post(getBaseUrl('myRequests'), data)
                .success(function (response) {
                    q.resolve(new Request(response));
                }).error(function(response, status) {
                    console.log(response);
                    if (status == 400) {
                        q.reject(response);
                    }
                });
            return q.promise;
        };
        this.acceptRequest = function (requestId,
                                       requested_game_condition_notes) {
            var url = getBaseUrl('incomingRequests') + requestId + '/accept/';
            var q = $q.defer();
            var data = {
                requested_game_condition_notes: requested_game_condition_notes,
            };
            $http
                .post(url, data)
                .success(function (response) {
                    q.resolve(new Request(response));
                });
            return q.promise;
        };
        this.refuseRequest = function (requestId) {
            var url = getBaseUrl('incomingRequests') + requestId + '/refuse/';
            var q = $q.defer();
            $http
                .post(url)
                .success(function (response) {
                    q.resolve(new Request(response));
                });
            return q.promise;
        };
        this.cancelRequest = function (requestId) {
            var url = getBaseUrl('myRequests') + requestId + '/cancel/';
            var q = $q.defer();
            $http
                .post(url)
                .success(function (response) {
                    q.resolve(new Request(response));
                });
            return q.promise;
        };
        this.finalizeRequest = function (requestId, swapped, other_feedback, other_feedback_notes) {
            var url = getBaseUrl('requests') + requestId + '/finalize/';
            var q = $q.defer();
            var data = {
                swapped: swapped,
                other_feedback: other_feedback,
                other_feedback_notes: other_feedback_notes
            };
            $http
                .post(url, data)
                .success(function (response) {
                    q.resolve(new Request(response));
                });
            return q.promise;
        };
        this.archiveRequest = function (requestId) {
            var url = getBaseUrl('requests') + requestId + '/archive/';
            var q = $q.defer();
            $http
                .post(url)
                .success(function (response) {
                    q.resolve(new Request(response));
                });
            return q.promise;
        };
        this.archiveAllRequests = function () {
            var url = getBaseUrl('requests') + 'archive-all/';
            var q = $q.defer();
            $http
                .post(url)
                .success(function (response) {
                    q.resolve(response);
                });
            return q.promise;
        };
    }
})();
