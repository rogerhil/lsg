(function () {
    'use strict';

    angular
        .module('app.requests')
        .directive('statusDisplay', statusDisplay);

    /*
     statusDisplay
     */
    statusDisplay.$inject = ['$rootScope'];
    function statusDisplay ($rootScope) {
        return {
            restrict: 'E',
            scope: {
                request: '=',
                previous: '='
            },
            link: function (scope) {
                scope.StatusLabelClasses = $rootScope.StatusLabelClasses;
                scope.StatusIcons = $rootScope.StatusIcons;
            },
            templateUrl: 'app/views/requests/directives/status-display.html'
        }
    };
})();
