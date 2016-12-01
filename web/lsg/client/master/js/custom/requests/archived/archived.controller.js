(function () {
    'use strict';

    angular
        .module('app.archived', ['ngAnimate'])
        .controller('ArchivedRequestsCtrl', ArchivedRequestsCtrl)
    ;

    /*
     ArchivedRequestsCtrl
     */
    ArchivedRequestsCtrl.$inject = ['$scope', '$q', '$filter', 'ngTableParams', '$rootScope', 'ArchivedRequestsService'];
    function ArchivedRequestsCtrl($scope, $q, $filter, ngTableParams, $rootScope, ArchivedRequestsService) {
        var self = this;
        self.user = $rootScope.user;
        self.archivedRequests = [];
        self.loaded = false;
        ArchivedRequestsService.getArchivedRequests().then(function (requests) {
            self.archivedRequests = requests;
            self.loaded = true;
        });

        self.tableParams = new ngTableParams({
            page: 1,            // show first page
            count: 10          // count per page
        }, {
            total: self.archivedRequests.length, // length of data
            getData: function ($defer, params) {
                // use build-in angular filter
                var filteredData = params.filter() ?
                    $filter('filter')(self.archivedRequests, params.filter()) :
                    self.archivedRequests;
                var orderedData = params.sorting() ?
                    $filter('orderBy')(filteredData, params.orderBy()) :
                    self.archivedRequests;

                params.total(orderedData.length); // set total for recalc pagination
                $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }
        });

    }

})();
