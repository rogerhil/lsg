
(function() {
    'use strict';

    angular
        .module('custom')
        .controller('LsgController', LsgController);

    LsgController.$inject = ['$log', '$mdDialog', '$rootScope', 'MatchesService'];
    function LsgController($log, $mdDialog, $rootScope, MatchesService) {
        var self = this;

        self.signOut = function () {
            var confirm = $mdDialog.confirm()
                .title('Are you sure you want to log out?')
                .textContent('')
                .ariaLabel('Log out')
                .ok("Yes")
                .cancel('No');
            $mdDialog.show(confirm).then(function () {
                window.location = '/logout/';
            }, function () {
                // TODO: maybe do something if cancel confirm
            });
        };

    }
})();
