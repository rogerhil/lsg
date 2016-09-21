
(function() {
    'use strict';

    angular
        .module('app.welcome', ['ngAnimate'])
        .controller('WelcomeCtrl', WelcomeCtrl)
        ;

    /*
      WelcomeCtrl
     */
    WelcomeCtrl.$inject = ['$scope', 'lsgConfig', '$timeout'];
    function WelcomeCtrl($scope, lsgConfig, $timeout) {
        var self = this;
        self.user = lsgConfig.authenticatedUser;
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
                template: "" +
                    "<div class='popover tour'>" +
                    "  <div class='arrow'></div>" +
                    "  <h3 class='popover-title'></h3>" +
                    "  <div class='popover-content'></div>" +
                    "  <div class='popover-navigation'>" +
                    "    <button class='btn btn-default' data-role='end'>Got it!</button>" +
                    "  </div>" +
                    "</div>",
                steps: [
                {
                    element: ".row.md-welcome-row .profile-col",
                    title: "Update your profile now!",
                    content: "Please update your profile giving your address " +
                             "and the game platforms you have.",
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
