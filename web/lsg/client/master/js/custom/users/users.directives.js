(function () {
    'use strict';

    angular
        .module('app.users')
        .directive('userRatings', userRatings)
        .directive('userPhotoRatingsDistance', userPhotoRatingsDistance)
        .directive('userRecentFeedback', userRecentFeedback)
        .controller('UserFeedbackCtrl', UserFeedbackCtrl)
        .controller('ReportUserCtrl', ReportUserCtrl)
        .directive('animateModelChange', animateModelChange);

    animateModelChange.$inject = ['$timeout'];
    function animateModelChange($timeout) {
        console.log(111);
        function animateModelChangeLink(scope, element, attrs) {
            var timer = null,
                timeout = (attrs.timeout || getTransitionDuration(element[0], attrs.$normalize)) || 300,
                currentClass = parseClassName(element.attr('class')) || 'model',
                incrementClass = attrs.incrementClass || currentClass + '--increment',
                decrementClass = attrs.decrementClass || currentClass + '--decrement',
                nonNumberClass = attrs.nonNumberClass || currentClass + '--non-number';

            function parseClassName(className) {
                // Don't read the ng-* class names on the element.
                var classComps = className.split(' ').filter(function (item) {
                    if (!(item.indexOf('ng-') > -1)) {
                        return item;
                    }
                });

                return classComps[classComps.length - 1];
            }

            function modelChanged(newVal, oldVal) {
                if (newVal !== oldVal) {
                    // The non-number class will be the default value.
                    var changeClass = nonNumberClass;

                    // Clear previous timeout.
                    if (timer) {
                        $timeout.cancel(timer);
                        timer = null;

                        // For very fast clicking to work, it's required to remove classes if a timeout is still active.
                        clearClasses();
                    }

                    // Figure out the correct class name based on the value change.
                    if (angular.isNumber(Number(newVal)) && !isNaN(Number(newVal))) {
                        if (Number(newVal) < Number(oldVal)) {
                            changeClass = decrementClass;
                        } else {
                            changeClass = incrementClass;
                        }
                    }

                    // Add class and set a 'remove' timeout.
                    element.addClass(changeClass);
                    timer = $timeout(function removeCartNumber() {
                        clearClasses();
                    }, Number(timeout));
                }
            }

            function clearClasses() {
                element.removeClass(incrementClass);
                element.removeClass(decrementClass);
                element.removeClass(nonNumberClass);
            }

            scope.$watch(function () {
                return attrs.model;
            }, modelChanged);
        }

        return {
            replace: true,
            restrict: 'A',
            link: animateModelChangeLink
        };
    }


    /*
     * @param <Object> computedStyle: an object containing all element computed styles.
     * @param <Function> normalize: a method that converts a given string to a camelCase format.
     *
     * @return <Int>: transition duration in milliseconds.
     */
    function getTransitionDuration(element, normalize) {
        var prefixes = ' webkit moz ms o khtml'.split(' '),
            result = 0,
            computedStyle = getComputedStyle(element),
            duration,
            delay,
            prefix;

        for (var i = 0; i < prefixes.length; i++) {
            prefix = prefixes[i] + '-';

            if (prefixes[i] === '') {
                prefix = '';
            }

            duration = computedStyle[normalize(prefix + 'transition-duration')];

            if (duration) {
                duration = (duration.indexOf('ms') > -1) ? parseFloat(duration) : parseFloat(duration) * 1000;

                // Check if there's a delay.
                delay = computedStyle[normalize(prefix + 'transition-delay')];

                if (delay) {
                    duration += (delay.indexOf('ms') > -1) ? parseFloat(delay) : parseFloat(delay) * 1000;
                }

                result = duration;
                break;
            }
        }

        return result;
    }



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
