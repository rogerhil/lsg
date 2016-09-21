(function() {
    'use strict';

    angular
        .module('app.requests')
        .service('RequestsService', RequestsService);

    RequestsService.$inject = ['$q', '$http', 'lsgConfig'];
    function RequestsService($q, $http, lsgConfig) {
        var userId = lsgConfig.authenticatedUser.id;
        var baseUrl = {
            myRequests: '/api/users/' + userId + '/my_requests/',
            incomingRequests: '/api/users/' + userId + '/incoming_requests/',
            requests: '/api/users/' + userId + '/requests/'
        };
        this.baseUrl = baseUrl;
        
        var Request = function (data) {
            for (var key in data) {
                this[key] = data[key];
            }
        };
        Request.prototype.isFinalizedByAuthenticatedUser = function () {
            var finalizing = this.isFinalizing() || this.isFinalized();
            var context;
            if (this.requester.id == userId) {
                context = 'requester';
            } else {
                context = 'requested';
            }
            var userFinalized = this[context + '_swapped'] != null && this[context + '_swapped'] != undefined;
            return finalizing && userFinalized;
        };
        Request.prototype.isPending = function () {
            return this.status == lsgConfig.Status.pending;
        };
        Request.prototype.isOngoing = function () {
            return this.status == lsgConfig.Status.ongoing;
        };
        Request.prototype.isCancelled = function () {
            return this.status == lsgConfig.Status.cancelled;
        };
        Request.prototype.isExpired = function () {
            return this.status == lsgConfig.Status.expired;
        };
        Request.prototype.isRefused = function () {
            return this.status == lsgConfig.Status.refused;
        };
        Request.prototype.isSucceeded = function () {
            return this.status == lsgConfig.Status.succeeded;
        };
        Request.prototype.isArchived = function () {
            return this.status == lsgConfig.Status.archived;
        };
        Request.prototype.isFinalizing = function () {
            return this.status == lsgConfig.Status.finalizing;
        };
        Request.prototype.isOpen = function () {
            return lsgConfig.Status.open_statuses.indexOf(this.status) != -1;
        };
        Request.prototype.isClosed = function () {
            return lsgConfig.Status.closed_statuses.indexOf(this.status) != -1;
        };
        Request.prototype.isFinalized = function () {
            return lsgConfig.Status.finalized_statuses.indexOf(this.status) != -1;
        };

        this.Request = Request;

        this.getMyRequests = function () {
            var q = $q.defer();
            $http
                .get(baseUrl.myRequests)
                .success(function (response) {
                    var requests = response.results.map(function (o) {return new Request(o)});
                    q.resolve(requests);
                });
            return q.promise;
        };
        this.getIncomingRequests = function () {
            var q = $q.defer();
            $http
                .get(baseUrl.incomingRequests)
                .success(function (response) {
                    var requests = response.results.map(function (o) {return new Request(o)});
                    q.resolve(requests);
                });
            return q.promise;
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
                .post(baseUrl.myRequests, data)
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
            var url = baseUrl.incomingRequests + requestId + '/accept/';
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
            var url = baseUrl.incomingRequests + requestId + '/refuse/';
            var q = $q.defer();
            $http
                .post(url)
                .success(function (response) {
                    q.resolve(new Request(response));
                });
            return q.promise;
        };
        this.cancelRequest = function (requestId) {
            var url = baseUrl.myRequests + requestId + '/cancel/';
            var q = $q.defer();
            $http
                .post(url)
                .success(function (response) {
                    q.resolve(new Request(response));
                });
            return q.promise;
        };
        this.finalizeRequest = function (requestId, swapped, other_feedback, other_feedback_notes) {
            var url = baseUrl.requests + requestId + '/finalize/';
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
            var url = baseUrl.requests + requestId + '/archive/';
            var q = $q.defer();
            $http
                .post(url)
                .success(function (response) {
                    q.resolve(new Request(response));
                });
            return q.promise;
        };
        this.archiveAllRequests = function () {
            var url = baseUrl.requests + 'archive-all/';
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
