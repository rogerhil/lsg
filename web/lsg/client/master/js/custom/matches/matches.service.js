(function() {
    'use strict';

    angular
        .module('app.matches')
        .service('MatchesService', MatchesService);

    MatchesService.$inject = ['$q', '$http', '$rootScope'];
    function MatchesService($q, $http, $rootScope) {

        this.getMatches = function () {
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
        }
    }
})();
