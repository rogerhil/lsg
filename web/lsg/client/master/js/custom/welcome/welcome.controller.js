
(function() {
    'use strict';

    angular
        .module('app.welcome', ['ngAnimate'])
        .controller('WelcomeCtrl', WelcomeCtrl)
        ;

    /*
      WelcomeCtrl
     */
    WelcomeCtrl.$inject = ['$scope', '$rootScope', '$timeout'];
    function WelcomeCtrl($scope, $rootScope, $timeout) {
        var self = this;
        self.user = $rootScope.user;
        self.tour;
        function tourActivate() {
            // BootstrapTour is not compatible with z-index based layout
            // so adding position:static for this case makes the browser
            // to ignore the property
            var section = angular.element('.wrapper > section');
            section.css({'position': 'static'});
            // finally restore on destroy and reuse the value declared in stylesheet
            $scope.$on('$destroy', function(){
                section.css({'position': ''});
            });
            var tour = new Tour({
                backdrop: true,
                backdropPadding: 'anything',
                keyboard: false,
                template: "" +
                    "<div class='popover tour'>" +
                    "  <div class='arrow'></div>" +
                    "  <h3 class='popover-title'></h3>" +
                    "  <div class='popover-content'></div>" +
                    "</div>",
                steps: [
                {
                    element: ".row.md-welcome-row .profile-col",
                    title: "Welcome to Let'SwapGames!",
                    content: "Please update your profile to get started.",
                    placement: 'top'
                }
            ]});
            tour.init();
            tour.start();
            tour.restart(true);
            self.tour = tour;
        }
        if (!self.user.address.latitude || !self.user.address.longitude) {
            $timeout(tourActivate, 3000);
        }


    }

})();
