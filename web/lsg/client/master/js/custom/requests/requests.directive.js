(function () {
    'use strict';

    angular
        .module('app.requests')
        .directive('statusDisplay', statusDisplay);

    /*
     statusDisplay
     */
    statusDisplay.$inject = ['lsgConfig'];
    function statusDisplay (lsgConfig) {
        console.log(lsgConfig);
        return {
            restrict: 'E',
            scope: {
                request: '=',
                previous: '='
            },
            link: function (scope) {
                scope.StatusLabelClasses = lsgConfig.StatusLabelClasses;
                scope.StatusIcons = lsgConfig.StatusIcons;
            },
            templateUrl: 'app/views/requests/directives/status-display.html'
        }
    };
})();
