(function() {
    'use strict';

    angular
        .module('app.matches')
        .service('MatchesService', MatchesService);

    MatchesService.$inject = ['$q', '$http', '$rootScope', '$timeout'];
    function MatchesService($q, $http, $rootScope, $timeout) {
        var self = this;

        self.getMatches = function () {
            var q = $q.defer();
            var userId = $rootScope.user.id;
            var baseUserUrl = '/api/users/' + userId + '/';
            var url = baseUserUrl + 'matches/';
            $http
                .get(url)
                .success(function (response) {
                    q.resolve(response);
                });
            return q.promise;
        };

        $rootScope.matchesPromise = undefined;
        $rootScope.matchesPollingInterval = 10000;
        $rootScope.matches = [];
        $rootScope.matchesWantedIds = [];
        $rootScope.matchesOwnedIds = [];

        function highlight(el) {
            el = $(el);
            el.addClass('highlight-enter');
            el.animate({'right': '+=20px'}, 200, 'swing', function () {
                el.animate({'right': '-=20px'}, 200);
            });
            $timeout(function () {
                el.addClass('highlight-exit');
            }, 100);
            $timeout(function () {
                el.removeClass('highlight-enter');
                el.removeClass('highlight-exit');
            }, 2100);
        }

        var loadMatches = function (callback) {
            self.getMatches().then(function (matches) {
                // filter invalid matches anyway
                matches = matches.filter(function (match) {
                    if (!match.no_games_left && !match.ongoing) {
                        return match;
                    }
                });
                if (callback) {
                    callback(matches);
                }
                console.log(matches.length);
                console.log($rootScope.matches.length);
                if (matches.length > $rootScope.matches.length) {
                    highlight('.nav li[sref="app.matches"]');
                }
                $rootScope.matches = matches;
                $rootScope.matchesWantedIds = matches.map(function (o) {
                    return o.iwish.id;
                });
                $rootScope.matchesOwnedIds = matches.reduce(function (reduced, match) {
                    var ids = match.all_wanted_games.length ? match.all_wanted_games.map(function (o) {return o.id}) : [];
                    return reduced.concat(ids);
                }, []);
            });
        };

        self.pollMatches = function (callback) {
            if (!$('md-dialog').length) {
                loadMatches(callback);
            }
            $rootScope.matchesPromise = $timeout(function () {
                self.pollMatches(callback);
            }, $rootScope.matchesPollingInterval);
        };

    }
})();
