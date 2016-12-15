(function () {
    'use strict';

    angular
        .module('app.users')
        .directive('userRatings', userRatings)
        .directive('userPhotoRatingsDistance', userPhotoRatingsDistance)
        .directive('userRecentFeedback', userRecentFeedback)
        .controller('UserFeedbackCtrl', UserFeedbackCtrl)
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
     UserFeedbackCtrl
     */
    UserFeedbackCtrl.$inject = ['$mdDialog', '$mdMedia', 'UsersService', 'user', 'distance', 'onfeedbackclose'];
    function UserFeedbackCtrl($mdDialog, $mdMedia, UsersService, user, distance, onfeedbackclose) {
        var self = this;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
        self.user = user;
        self.distance = distance;
        self.recentFeedback = [];
        self.close = function () {
            $mdDialog.hide();
            if (onfeedbackclose) {
                onfeedbackclose();
            }
        };
        UsersService.recentFeedback(user).then(function (recentFeedback) {
            self.recentFeedback = recentFeedback;
        });
        self.reportUser = function () {
            $mdDialog.show({
                controllerAs: 'ctrl',
                controller: 'ReportUserCtrl',
                locals: {user: self.user, onreportuserclose: onfeedbackclose},
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
            $scope.showUserFeedback = function (user, onfeedbackclose) {
                $mdDialog.show({
                    controllerAs: 'ctrl',
                    controller: 'UserFeedbackCtrl',
                    locals: {user: user, distance: $scope.distance, onfeedbackclose: onfeedbackclose},
                    templateUrl: 'app/views/users/user.feedback.html',
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
                hidefeedback: '=',
                onfeedbackclose: '='
            },
            controller: controller,
            templateUrl: 'app/views/users/directives/user-photo-ratings-distance.html'
        }
    }

    /*
     userRecentFeedback
     */
    userRecentFeedback.$inject = [];
    function userRecentFeedback () {
        return {
            restrict: 'E',
            scope: {
                user: '=',
                recentfeedback: '='
            },
            templateUrl: 'app/views/users/directives/user-recent-feedback.html'
        }
    }


})();
