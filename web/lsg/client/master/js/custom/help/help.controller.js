
// To run this code, edit file index.html or index.jade and change
// html data-ng-app attribute from angle to myAppName
// ----------------------------------------------------------------------

(function() {
    'use strict';

    angular
        .module('custom')
        .controller('HelpController', HelpController);

    HelpController.$inject = ['$scope', '$rootScope'];
    function HelpController($scope, $rootScope) {
        var self = this;
        $scope.StatusLabelClasses = $rootScope.StatusLabelClasses;
        $scope.StatusIcons = $rootScope.StatusIcons;
    }
})();
