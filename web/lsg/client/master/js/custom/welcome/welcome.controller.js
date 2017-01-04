
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
    WelcomeCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$mdMedia', '$mdDialog', 'GlobalFixes', '$route'];
    function WelcomeCtrl($scope, $rootScope, $timeout, $mdMedia, $mdDialog, GlobalFixes, $route) {
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
                templateUrl: $rootScope.viewPath('users/terms-and-conditions.html'),
                parent: angular.element(document.body),
                fullscreen: useFullScreen
            });
        };

        self.tourActivate = function() {
            GlobalFixes.fixZindex($scope);
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
                    GlobalFixes.fixZindexOnEnd();
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

        $timeout(function () {
            $route.reload();
        }, 15000);


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
