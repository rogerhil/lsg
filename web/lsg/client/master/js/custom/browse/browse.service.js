(function() {
    'use strict';

    angular
        .module('app.browse')
        .service('BrowseService', BrowseService);

    BrowseService.$inject = ['$q', '$http', '$rootScope', 'Notify'];
    function BrowseService($q, $http, $rootScope, Notify) {

        this.getGames = function (ordering, platform) {
            var url = '/api/games/?limit=60&ordering=' + ordering;
            var q = $q.defer();
            if (platform) {
                url += '&platform_id=' + platform;
            }
            $http.get(url).success(function (response) {
                q.resolve(response.results);
            });
            return q.promise;
        };
    }
})();
