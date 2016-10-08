(function() {
    'use strict';

    angular
        .module('app.customSettings')
        .service('ConstantsService', ConstantsService);

    ConstantsService.$inject = ['$q', '$http'];
    function ConstantsService($q, $http) {

        this.get = function () {
            var url = '/api/constants/';
            var q = $q.defer();
            $http.get(url).success(function (response) {
                q.resolve(response);
            });
            return q.promise;
        };
    }
})();
