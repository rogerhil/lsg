(function() {
    'use strict';

    angular
        .module('app.archived')
        .service('ArchivedRequestsService', ArchivedRequestsService);

    ArchivedRequestsService.$inject = ['$q', '$http', '$rootScope', 'RequestsService'];
    function ArchivedRequestsService($q, $http, $rootScope, RequestsService) {
        var userId = $rootScope.user.id;
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
