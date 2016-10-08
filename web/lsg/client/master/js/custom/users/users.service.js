(function() {
    'use strict';

    angular
        .module('app.users')
        .service('UsersService', UsersService)
        .factory('User', User);

    User.$inject = [];
    function User() {
        var User = function(data) {
            for (var key in data) {
                this[key] = data[key];
            }
        };
        User.prototype.hasBasicProfile = function () {
            return this.first_name && this.last_name && this.phone1 && this.phone1_prefix;
        };
        User.prototype.havePlatforms = function () {
            return this.platforms.length;
        };
        User.prototype.hasAddress = function () {
            return this.address.latitude && this.address.longitude;
        };
        User.prototype.isProfileComplete = function () {
            return this.hasBasicProfile() && this.havePlatforms() && this.hasAddress();
        };
        User.prototype.flag = function () {
            var url;
            switch (this.address.country.toLowerCase()) {
                case 'ireland':
                    url = 'app/img/ie64px.png';
                    break;
                case 'united kingdom':
                    url = 'app/img/uk64px.png';
                    break;
                case 'isle of man':
                    url = 'app/img/im64px.png';
                    break;
                default:
                    url = 'app/img/questionmark.png';
                    break;
            }
            return url;
        };
        User.prototype.isCountrySupported = function () {
            var supported = ['ireland', 'unied kingdom', 'isle of man'];
            if (this.address.country) {
                return supported.indexOf(this.address.country.toLowerCase()) != -1;
            }
            return false;
        };
        return User;
    }

    UsersService.$inject = ['$q', '$http', '$rootScope', 'User'];
    function UsersService($q, $http, $rootScope, User) {
        var userId = $rootScope.user.id;
        var baseUserUrl = '/api/users/' + userId + '/';

        this.queryAddress = function (query) {
            var q = $q.defer();
            $http
                .get(baseUserUrl + 'query-address/?search=' + query)
                .success(function (response) {
                    q.resolve(response);
                });
            return q.promise;
        };

        this.getUserDetails = function () {
            var q = $q.defer();
            $http
                .get(baseUserUrl)
                .success(function (response) {
                    q.resolve(new User(response));
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
                    q.resolve(new User(response));
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
                    q.resolve(new User(response));
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
