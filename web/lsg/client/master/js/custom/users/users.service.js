(function() {
    'use strict';

    angular
        .module('app.users')
        .service('UsersService', UsersService)
        .factory('User', User);

    User.$inject = ['$rootScope'];
    function User($rootScope) {
        var User = function(data) {
            for (var key in data) {
                this[key] = data[key];
            }
        };
        User.prototype.hasBasicProfile = function () {
            return this.first_name && this.last_name && this.email && this.phone1;
        };
        User.prototype.hasAddress = function () {
            return this.address.latitude && this.address.longitude;
        };
        User.prototype.isProfileComplete = function () {
            return this.hasBasicProfile() && this.hasAddress();
        };
        User.prototype.isCountrySupported = function () {
            var supported = $rootScope.constants.countries.map(function(o) {
                return o.code;
            });
            if (this.address.country) {
                return supported.indexOf(this.address.country.code) != -1;
            }
            return false;
        };
        return User;
    }

    UsersService.$inject = ['$q', '$http', '$rootScope', 'User', 'Notify', '$timeout', '$state'];
    function UsersService($q, $http, $rootScope, User, Notify, $timeout, $state) {
        var userId;
        var baseUserUrl;

        this.loadAuthenticatedUser = function (event) {
            var q = $q.defer();
            if (event && event.targetScope && event.targetScope.user != undefined && event.targetScope.user != null) {
                q.resolve(event.targetScope.user);
                return q;
            }
            $http.get('/api/users/authenticated/').success(function (response) {
                var user;
                if (response) {
                    user = new User(response);
                    $timeout(function () {
                        if (!user.enabled) {
                            if ($state.current.name != 'pages.500' && $state.current.name != 'pages.403' && $state.current.name != 'pages.400') {
                                window.location = '/';
                            }
                        }
                    }, 500);

                    $rootScope.user = user;

                    userId = $rootScope.user.id;
                    baseUserUrl = '/api/users/' + userId + '/';

                    q.resolve(user);
                } else {
                    if (event) {
                        event.preventDefault();
                    }
                    q.reject();
                    return;
                }
                var initialAlert = function () {
                    if (!$rootScope.user.isProfileComplete()) {
                        Notify.closeAll(false, true);
                        Notify.alert("You need to complete your profile details in " +
                            "order to continue using the application. <a style='color: yellow;' href='#/app/profile'>" +
                            "Click here to access the profile form.</a>", {status: 'danger', timeout: 7000});
                    }
                };

                $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
                    if (toState.name == 'app.welcome' || toState.name == 'app.users') {
                        return;
                    }
                    if (!user.hasBasicProfile()) {
                        initialAlert();
                    }
                });

            }).error(function (response, status) {
                if (status == 400) {
                    q.reject();
                    return;
                }
                //q.resolve();
                $state.transitionTo("pages.500");
            });
            return q;
        };


        this.queryAddress = function (query) {
            var q = $q.defer();
            $http
                .get(baseUserUrl + 'query-address/?search=' + query)
                .success(function (response) {
                    q.resolve(response);
                });
            return q.promise;
        };

        this.updateUserCountsStarsDetails = function () {
            var q = $q.defer();
            if (!baseUserUrl) {
                return;
            }
            $http
                .get(baseUserUrl + 'counts-stars/')
                .success(function (response) {
                    var updatedUser = $rootScope.user;
                    for (var key in response) {
                        updatedUser[key] = response[key];
                    }
                    $rootScope.user = updatedUser;
                    q.resolve(new User(updatedUser));
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
        this.delete = function () {
            var q = $q.defer();
            $http
                .delete(baseUserUrl)
                .success(function (response) {
                    q.resolve(response);
                }).error(function(response, status) {
                    if (status == 403) {
                        q.reject(response);
                    }
                });
            return q.promise;
        };
        this.recentFeedback = function (user) {
            var q = $q.defer();
            var baseUrl = baseUserUrl;
            if (user) {
                baseUrl = '/api/users/' + user.id + '/';
            }
            $http
                .get(baseUrl + 'recent-feedback/')
                .success(function (response) {
                    q.resolve(response);
                });
            return q.promise;
        };
        this.recentActivities = function () {
            var q = $q.defer();
            $http
                .get(baseUserUrl + 'recent-activities')
                .success(function (response) {
                    q.resolve(response);
                });
            return q.promise;
        };
        this.reportUser = function (data) {
            var q = $q.defer();
            var url = baseUserUrl + 'report-user/';
            $http
                .post(url, data)
                .success(function (response) {
                    q.resolve(response);
                }).error(function(response, status) {
                    if (status == 400) {
                        q.reject(response);
                    }
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
        this.getCollection = function (platformId) {
            var q = $q.defer();
            var url = baseUserUrl + 'collection/';
            if (platformId) {
                url += '?p=' + platformId;
            }
            $http
                .get(url)
                .success(function (response) {
                    q.resolve(response.results);
                });
            return q.promise;
        };
        this.getWishlist = function (platformId) {
            var q = $q.defer();
            var url = baseUserUrl + 'wishlist/';
            if (platformId) {
                url += '?p=' + platformId;
            }
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
