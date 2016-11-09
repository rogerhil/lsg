(function () {
    'use strict';

    angular
        .module('app.users')
        .directive('userRatings', userRatings)
        .directive('userPhotoRatingsDistance', userPhotoRatingsDistance)
        .directive('userLatestFeedbacks', userLatestFeedbacks)
        .controller('UserFeedbacksCtrl', UserFeedbacksCtrl)

    /*
     userRatings
     */
    userRatings.$inject = [];
    function userRatings () {
        return {
            restrict: 'E',
            scope: {
                user: '='
            },
            templateUrl: 'app/views/users/directives/user-ratings.html'
        }
    }

    /*
     UserFeedbacksCtrl
     */
    UserFeedbacksCtrl.$inject = ['$mdDialog', 'UsersService', 'user', 'distance', 'onfeedbacksclose'];
    function UserFeedbacksCtrl($mdDialog, UsersService, user, distance, onfeedbacksclose) {
        var self = this;
        self.user = user;
        self.distance = distance;
        self.latestFeedbacks = [];
        self.close = function () {
            $mdDialog.hide();
            if (onfeedbacksclose) {
                onfeedbacksclose();
            }
        };
        UsersService.latestFeedbacks(user).then(function (latestFeedbacks) {
            self.latestFeedbacks = latestFeedbacks;
        });
    }

    /*
     userPhotoRatingsDistance
     */
    userPhotoRatingsDistance.$inject = [];
    function userPhotoRatingsDistance () {
        var controller = ['$scope', '$mdMedia', '$mdDialog', function ($scope, $mdMedia, $mdDialog) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $scope.showUserFeedbacks = function (user, onfeedbacksclose) {
                $mdDialog.show({
                    controllerAs: 'ctrl',
                    controller: 'UserFeedbacksCtrl',
                    locals: {user: user, distance: $scope.distance, onfeedbacksclose: onfeedbacksclose},
                    templateUrl: 'app/views/users/user.feedbacks.html',
                    parent: angular.element(document.body),
                    clickOutsideToClose: true,
                    fullscreen: useFullScreen
                });
            }
        }];
        return {
            restrict: 'E',
            scope: {
                user: '=',
                distance: '=',
                hidefeedbacks: '=',
                onfeedbacksclose: '='
            },
            controller: controller,
            templateUrl: 'app/views/users/directives/user-photo-ratings-distance.html'
        }
    }

    /*
     userLatestFeedbacks
     */
    userLatestFeedbacks.$inject = [];
    function userLatestFeedbacks () {
        return {
            restrict: 'E',
            scope: {
                user: '=',
                latestfeedbacks: '='
            },
            templateUrl: 'app/views/users/directives/user-latest-feedbacks.html'
        }
    }


})();
