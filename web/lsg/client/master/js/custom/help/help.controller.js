
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
