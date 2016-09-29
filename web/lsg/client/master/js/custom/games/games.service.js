(function() {
    'use strict';

    angular
        .module('app.games')
        .service('GamesService', GamesService);

    GamesService.$inject = ['$q', '$http', '$rootScope', 'Notify'];
    function GamesService($q, $http, $rootScope, Notify) {
        this.query = function (query, excludeGames) {
            var url = '/api/games/?search=' + query;
            var q = $q.defer();
            if ($rootScope.user.platforms.length) {
                url += '&platform_id=' + $rootScope.user.platforms.join(',');
            } else {
                Notify.closeAll(false, true);
                Notify.alert("Select your platforms in the profile page first!", {group: true});
                q.resolve([]);
                return q.promise;
            }
            if (!$rootScope.user.address.latitude || !$rootScope.user.address.longitude) {
                Notify.closeAll(false, true);
                Notify.alert("You need to provide your address in the profile form in order to use the application.", {status: 'warning', group: true});
                q.resolve([]);
                return q.promise;
            }
            if (excludeGames.length) {
                url += '&exclude_games=' + excludeGames.join(',');
            }
            $http.get(url).success(function (response) {
                var results = response.results;
                results = results.map(function (item) {
                    return {
                        value: item.id,
                        display: item.name + ' (' + item.platform.name + ')'
                    }
                });
                q.resolve(results);
            });
            return q.promise;
        };

        this.getPlatforms = function () {
            var url = '/api/platforms/?limit=200';
            var q = $q.defer();
            $http.get(url).success(function (response) {
                q.resolve(response.results);
            });
            return q.promise;
        };
    }
})();
