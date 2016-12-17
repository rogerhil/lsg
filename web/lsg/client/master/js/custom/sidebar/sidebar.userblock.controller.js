(function () {
    'use strict';

    angular
        .module('app.sidebar')
        .controller('UserBlockController', UserBlockController);

    UserBlockController.$inject = ['$scope', '$rootScope'];
    function UserBlockController($scope, $rootScope) {

        activate();

        ////////////////

        function activate() {

            $rootScope.userBlockVisible = true;

            var detach = $scope.$on('toggleUserBlock', function (/*event, args*/) {
                $rootScope.userBlockVisible = !$rootScope.userBlockVisible;
            });

            $scope.$on('$destroy', detach);
        }
    }
})();
