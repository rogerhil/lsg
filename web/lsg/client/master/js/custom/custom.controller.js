
// To run this code, edit file index.html or index.jade and change
// html data-ng-app attribute from angle to myAppName
// ----------------------------------------------------------------------

(function() {
    'use strict';

    angular
        .module('custom')
        .controller('LsgController', LsgController);

    LsgController.$inject = ['$log', '$mdDialog'];
    function LsgController($log, $mdDialog) {
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

        function activate() {
          $log.log('I\'m a line from custom.js');
        }

    }
})();
