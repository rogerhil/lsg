(function() {
    'use strict';

    angular
        .module('app.archived')
        .service('ArchivedRequestsService', ArchivedRequestsService);

    ArchivedRequestsService.$inject = ['$q', '$http', 'lsgConfig', 'RequestsService'];
    function ArchivedRequestsService($q, $http, lsgConfig, RequestsService) {
        var userId = lsgConfig.authenticatedUser.id;
        var Request = RequestsService.Request;

        this.getArchivedRequests = function () {
            var q = $q.defer();
            var url = RequestsService.baseUrl.requests + 'archived/';
            $http
                .get(url)
                .success(function (response) {
                    var requests = response.results.map(function (o) {return new Request(o)});
                    q.resolve(requests);
                });
            return q.promise;
        };
    }
})();
