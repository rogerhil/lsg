/**=========================================================
 * Module: demo-notify.js
 * Provides a simple demo for notify
 =========================================================*/
(function() {
    'use strict';

    angular
        .module('app.notify')
        .controller('NotifyDemoCtrl', NotifyDemoCtrl);

    NotifyDemoCtrl.$inject = ['Notify', '$timeout'];
    function NotifyDemoCtrl(Notify, $timeout) {
        var vm = this;

    }
})();
