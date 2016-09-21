(function() {
    'use strict';

    angular
        .module('app.matches')
        .service('MatchesService', MatchesService);

    MatchesService.$inject = ['$q', '$http', 'lsgConfig'];
    function MatchesService($q, $http, lsgConfig) {

        this.getMatches = function () {
            var q = $q.defer();
            var userId = lsgConfig.authenticatedUser.id;
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
