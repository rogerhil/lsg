(function() {
    'use strict';

    angular
        .module('app.browse')
        .service('BrowseService', BrowseService);

    BrowseService.$inject = ['$q', '$http', '$rootScope', 'Notify'];
    function BrowseService($q, $http, $rootScope, Notify) {
        var self = this;
        self.limit = 60;
        self.counts = {};

        self.getGames = function (ordering, platform, page) {
            var url = '/api/games/detailed/?limit=' + self.limit + '&ordering=' + ordering;
            var q = $q.defer();
            var offset;
            var urlWithoutOffset;
            if (platform) {
                url += '&platform_id=' + platform;
            }
            urlWithoutOffset = url;
            if (page && page > 1) {
                offset = ((page - 1) * self.limit);
                url += '&offset=' + offset;
            }
            if (self.counts[urlWithoutOffset] && offset > self.counts[urlWithoutOffset]) {
                q.resolve([]);
            } else {
                $http.get(url).success(function (response) {
                    self.counts[urlWithoutOffset] = response.count;
                    q.resolve(response.results);
                });
            }
            return q.promise;
        };
    }
})();
