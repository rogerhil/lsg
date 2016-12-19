
(function() {
    'use strict';

    angular
        .module('app.welcome', ['ngAnimate'])
        .controller('WelcomeCtrl', WelcomeCtrl)
        .controller('TermsAndConditionsDialogCtrl', TermsAndConditionsDialogCtrl)
        ;

    /*
      WelcomeCtrl
     */
    WelcomeCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$mdMedia', '$mdDialog', 'GlobalFixes'];
    function WelcomeCtrl($scope, $rootScope, $timeout, $mdMedia, $mdDialog, GlobalFixes) {
        var self = this;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
        self.user = $rootScope.user;
        self.tour = undefined;

        self.openTermsAndConditions = function () {
            if (self.user.accepted_terms) {
                return;
            }
            $mdDialog.show({
                controllerAs: 'ctrl',
                controller: TermsAndConditionsDialogCtrl,
                locals: {welcomeCtrl: self},
                templateUrl: 'app/views/users/terms-and-conditions.html',
                parent: angular.element(document.body),
                fullscreen: useFullScreen
            });
        };

        self.tourActivate = function() {
            // BootstrapTour is not compatible with z-index based layout
            // so adding position:static for this case makes the browser
            // to ignore the property
            var section = angular.element('.wrapper > section');
            section.css({'position': 'static'});
            // finally restore on destroy and reuse the value declared in stylesheet
            $scope.$on('$destroy', function(){
                section.css({'position': ''});
            });
            GlobalFixes.closeAllTours();
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
                onEnd: function (tour) {
                    GlobalFixes.closeAllTours();
                },
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
        };

        if (!self.user.acceptedTerms()) {
            self.openTermsAndConditions();
        }

        if (!self.user.hasAddress() && self.user.acceptedTerms()) {
            $timeout(self.tourActivate, 3000);
        }


    }

    TermsAndConditionsDialogCtrl.$inject = ['$scope', '$mdDialog', 'UsersService', '$rootScope', 'welcomeCtrl'];
    function TermsAndConditionsDialogCtrl($scope, $mdDialog, UsersService, $rootScope, welcomeCtrl) {
        var self = this;
        self.disagreeToTerms = function () {
            window.location = '/logout/';
        };

        self.agreeToTerms = function () {
            UsersService.acceptTerms().then(function (user) {
                self.user = user;
                $rootScope.user = user;
                $mdDialog.hide();
                welcomeCtrl.tourActivate();
            }).catch(function () {
                self.disagreeToTerms();
            });
        };

    }

})();
