(function() {
    'use strict';

    angular
        .module('app.games')
        .service('GamesService', GamesService);

    GamesService.$inject = ['$q', '$http', '$rootScope', 'Notify'];
    function GamesService($q, $http, $rootScope, Notify) {
        this.query = function (query, excludeGames, platform) {
            var url = '/api/games/?search=' + query;
            var q = $q.defer();
            if (!$rootScope.user.hasAddress()) {
                Notify.closeAll(false, true);
                Notify.alert("You need to provide your address in the profile form in order to use the application.", {group: true});
                q.resolve([]);
                return q.promise;
            }
            if (!$rootScope.user.hasBasicProfile()) {
                Notify.closeAll(false, true);
                Notify.alert("You need to complete your profile in order to use the application.", {group: true});
                q.resolve([]);
                return q.promise;
            }
            if (excludeGames.length) {
                url += '&exclude_games=' + excludeGames.join(',');
            }
            if (platform) {
                url += '&platform_id=' + platform;
            }
            $http.get(url).success(function (response) {
                var results = response.results;
                results = results.map(function (item) {
                    return {
                        value: item.id,
                        display: item.full_name,
                        item: item
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
