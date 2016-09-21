(function() {
    'use strict';

    angular
        .module('app.users')
        .service('UsersService', UsersService);

    UsersService.$inject = ['$q', '$http', 'lsgConfig'];
    function UsersService($q, $http, lsgConfig) {
        var userId = lsgConfig.authenticatedUser.id;
        var baseUserUrl = '/api/users/' + userId + '/';

        this.getUserDetails = function () {
            var q = $q.defer();
            $http
                .get(baseUserUrl)
                .success(function (response) {
                    q.resolve(response);
                });
            return q.promise;
        };
        this.latestFeedbacks = function () {
            var q = $q.defer();
            $http
                .get(baseUserUrl + 'latest-feedbacks/')
                .success(function (response) {
                    q.resolve(response);
                });
            return q.promise;
        };
        this.latestActivities = function () {
            var q = $q.defer();
            $http
                .get(baseUserUrl + 'latest-activities')
                .success(function (response) {
                    q.resolve(response);
                });
            return q.promise;
        };
        this.updateUser = function (data) {
            var q = $q.defer();
            $http
                .put(baseUserUrl, data)
                .success(function (response) {
                    q.resolve(response);
                }).error(function(response, status) {
                    if (status == 400) {
                        q.reject(response);
                    }
                });
            return q.promise;
        };
        this.updateUserPicture = function (image) {
            var q = $q.defer();
            var url = baseUserUrl + 'picture/';
            $http
                .put(url, {picture_image: image})
                .success(function (response) {
                    q.resolve(response);
                }).error(function(response, status) {
                    if (status == 400) {
                        q.reject(response);
                    }
                });
            return q.promise;
        };
        this.getCollection = function () {
            var q = $q.defer();
            var url = baseUserUrl + 'collection/';
            $http
                .get(url)
                .success(function (response) {
                    q.resolve(response.results);
                });
            return q.promise;
        };
        this.getWishlist = function () {
            var q = $q.defer();
            var url = baseUserUrl + 'wishlist/';
            $http
                .get(url)
                .success(function (response) {
                    q.resolve(response.results);
                });
            return q.promise;
        };
        this.addGameTo = function (gameId, context) {
            var q = $q.defer();
            var url = baseUserUrl + context + '/';
            $http
                .post(url, {game_id: gameId})
                .success(function (response) {
                    q.resolve(response);
                })
                .error(function (response, status) {
                    if (status == 400) {
                        q.reject(response);
                    }
                });
            return q.promise;
        };
        this.removeGameFrom = function (collectionId, context) {
            var q = $q.defer();
            var url = baseUserUrl + context + '/' + collectionId + '/';
            $http
                .delete(url)
                .success(function (response) {
                    q.resolve(response);
                })
                .error(function (response, status) {
                    if (status == 400) {
                        q.reject(response);
                    }
                });
            return q.promise;
        };
    }
})();
