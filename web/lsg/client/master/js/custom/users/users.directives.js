(function () {
    'use strict';

    angular
        .module('app.users')
        .directive('userRatings', userRatings)
        .directive('userPhotoRatingsDistance', userPhotoRatingsDistance)
        .directive('userLatestFeedbacks', userLatestFeedbacks)
        .controller('UserFeedbacksCtrl', UserFeedbacksCtrl)
        .controller('ReportUserCtrl', ReportUserCtrl)

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
     ReportUserCtrl
     */
    ReportUserCtrl.$inject = ['$mdDialog', 'UsersService', 'user', 'onreportuserclose'];
    function ReportUserCtrl($mdDialog, UsersService, user, onreportuserclose) {
        var self = this;
        self.user = user;
        self.data = {reported_id: user.id};
        self.close = function () {
            $mdDialog.hide();
            if (onreportuserclose) {
                onreportuserclose();
            }
        };
        self.reportUser = function () {
            UsersService.reportUser(self.data).then(function (response) {
                var alert = $mdDialog.alert()
                    //.title('Report user')
                    .textContent(response.message).ok("Ok");
                    //.ariaLabel('Report user');
                $mdDialog.show(alert).then(function () {
                    if (onreportuserclose) {
                        onreportuserclose();
                    }
                });
            });
        };
    }

    /*
     UserFeedbacksCtrl
     */
    UserFeedbacksCtrl.$inject = ['$mdDialog', '$mdMedia', 'UsersService', 'user', 'distance', 'onfeedbacksclose'];
    function UserFeedbacksCtrl($mdDialog, $mdMedia, UsersService, user, distance, onfeedbacksclose) {
        var self = this;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
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
        self.reportUser = function () {
            $mdDialog.show({
                controllerAs: 'ctrl',
                controller: 'ReportUserCtrl',
                locals: {user: self.user, onreportuserclose: onfeedbacksclose},
                templateUrl: 'app/views/users/report-user-form.html',
                parent: angular.element(document.body),
                clickOutsideToClose: true,
                fullscreen: useFullScreen
            });
        };
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
