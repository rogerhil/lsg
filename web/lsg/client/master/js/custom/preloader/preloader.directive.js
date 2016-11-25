(function () {
    'use strict';

    angular
        .module('app.preloader')
        .directive('preloader', preloader);

    preloader.$inject = ['$animate', '$timeout', '$q', '$http', '$rootScope', 'Notify', '$state', '$stateParams', 'User'];
    function preloader($animate, $timeout, $q, $http, $rootScope, Notify, $state, $stateParams, User) {
        var counter = 0;
        var failedToGetUser = false;

        var locationChange = function (event, next, current) {
            var currentSplitted = current.split('#');
            var nextSplitted = next.split('#');
            var el = angular.element(".preloader-progress").parent();
            if (nextSplitted.length > 1) {
                switch (nextSplitted[1]) {
                    case '/500':
                        $state.transitionTo("pages.500");
                        endCounter($rootScope, el);
                        return;
                    case '/403':
                        $state.transitionTo("pages.403");
                        endCounter($rootScope, el);
                        return;
                    case '/400':
                        $state.transitionTo("pages.400");
                        endCounter($rootScope, el);
                        return;
                }
            }
            // if (currentSplitted.length > 1) {
            //     switch (currentSplitted[1]) {
            //         case '/500':
            //             $state.transitionTo("pages.500");
            //             endCounter($rootScope, el);
            //             return;
            //         case '/403':
            //             $state.transitionTo("pages.403");
            //             endCounter($rootScope, el);
            //             return;
            //         case '/400':
            //             $state.transitionTo("pages.400");
            //             endCounter($rootScope, el);
            //             return;
            //     }
            // }
            if ($rootScope.user && $rootScope.user.deleted) {
                window.location = '/logout/';
                return;
            }
            if ($rootScope.user && !$rootScope.user.enabled) {
                window.location = '/';
                return;
            }
            if (nextSplitted.length > 1 && nextSplitted[1].slice(0, 8) == '/sign-in' && failedToGetUser) {
                endCounter($rootScope, el);
                return;
            }
            if (event && event.targetScope) {
                if (event.targetScope.user === undefined || event.targetScope.user == null) {
                    event.preventDefault();
                } else {
                    return;
                }
            }
            link($rootScope, el, event, current);
        };

        $rootScope.$on('$locationChangeStart', locationChange);

        var directive = {
            restrict: 'EAC',
            template: '<div class="preloader-progress">' +
            '<div class="preloader-progress-bar" ' +
            'ng-style="{width: loadCounter + \'%\'}"></div>' +
            '</div>'
            ,
            link: link
        };
        return directive;

        function link(scope, el, event, sref) {
            startLoader(scope, el);

            appReady(scope, event, sref).then(function () {
                if (sref) {
                    var states = $state.get();
                    var state;
                    var matchedState;
                    var toParams = {};
                    for (var k = 0; k < states.length; k++) {
                        state = states[k];
                        if (!state.$$state) continue;
                        var privatePortion = state.$$state();
                        var urlHashSplit = sref.split('#');
                        if (urlHashSplit.length > 1) {
                            var split = urlHashSplit[1].split('?');
                            var u = split[0];
                            toParams = {};
                            var match = privatePortion.url.exec(u);
                            if (match) {
                                matchedState = state;
                                if (split.length > 1) {
                                    var qs = split[1].split('&');
                                    for (var k = 0; k < qs.length; k++) {
                                        var keyValue = qs[k].split('=');
                                        toParams[keyValue[0]] = decodeURI(keyValue[1]);
                                    }
                                }
                                break;
                            }
                        }
                    }
                    if (matchedState) {
                        if (matchedState.name == 'pages.signIn') {
                            $state.transitionTo("app.welcome");
                        } else {
                            $state.transitionTo(matchedState.name, toParams);
                        }
                    } else {
                        $state.transitionTo("app.welcome");
                    }
                    endCounter(scope, el);
                } else {
                    //endCounter(scope, el);
                }
            }, function () {
                endCounter(scope, el);
                failedToGetUser = true;
                redirectToSignInPage();
            });
        } //link

        function redirectToSignInPage() {
            var nexts = window.location.hash.toString().split('?next=');
            if (nexts.length > 1) {
                $state.transitionTo("pages.signIn", {next: nexts[1]});
            } else {
                $state.transitionTo("pages.signIn");
            }
        }

        function loadAuthenticatedUser(event) {
            var q = $q.defer();
            if (event && event.targetScope && event.targetScope.user != undefined && event.targetScope.user != null) {
                q.resolve(event.targetScope.user);
                return q;
            }
            $http.get('/api/users/authenticated/').success(function (response) {
                var user;
                if (response) {
                    user = new User(response);
                    $timeout(function () {
                        if (!user.enabled) {
                            if ($state.current.name != 'pages.500' && $state.current.name != 'pages.403' && $state.current.name != 'pages.400') {
                                window.location = '/';
                                return;
                            }
                        }
                    }, 500);

                    $rootScope.user = user;
                    q.resolve(user);
                } else {
                    if (event) {
                        event.preventDefault();
                    }
                    failedToGetUser = true;
                    //redirectToSignInPage();
                    q.reject();
                    return;
                }
                var initialAlert = function () {
                    if (!$rootScope.user.isProfileComplete()) {
                        Notify.closeAll(false, true);
                        Notify.alert("You need to complete your profile details in " +
                            "order to continue using the application. <a style='color: yellow;' href='#/app/profile'>" +
                            "Click here to access the profile form.</a>", {status: 'danger', timeout: 7000});
                    }
                };

                $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
                    if (toState.name == 'app.welcome' || toState.name == 'app.users') {
                        return;
                    }
                    if (!user.hasBasicProfile()) {
                        initialAlert();
                    }
                });

            }).error(function (response, status) {
                if (status == 400) {
                    q.reject();
                    return;
                }
                //q.resolve();
                $state.transitionTo("pages.500");
            });
            return q;
        }

        ///////

        function startCounter(scope) {
            var remaining = 100 - counter;
            counter = counter + (0.015 * Math.pow(1 - Math.sqrt(remaining), 2));
            scope.loadCounter = parseInt(counter, 10);
            var timeout = $timeout(function () { startCounter(scope) }, 20);
            scope.$on('$destroy', function(){
                scope.loadCounter = 100;
                $timeout.cancel(timeout);
            });
            scope.$on('$locationChangeStart', function(){
                scope.loadCounter = 100;
                $timeout.cancel(timeout);
            });
            scope.$on('$stateChangeStart', function(){
                scope.loadCounter = 100;
                $timeout.cancel(timeout);
            });
        }

        function endCounter(scope, el) {
            scope.loadCounter = 100;
            $timeout(function () {
                // animate preloader hiding
                $animate.addClass(el, 'preloader-hidden');
                // retore scrollbar
                angular.element('body').css('overflow', '');
                counter = 0;
            }, 10);
        }

        function startLoader(scope, el) {
            scope.loadCounter = 0;
            angular.element('body').css('overflow', 'hidden');
            el.addClass('preloader');
            $timeout(function () { startCounter(scope) });
        }

        function appReady(scope, event) {
            //var deferred = $q.defer();
            var deferred = loadAuthenticatedUser(event);
            var viewsLoaded = 0;
            // if this doesn't sync with the real app ready
            // a custom event must be used instead
            var off = scope.$on('$viewContentLoaded', function () {
                viewsLoaded++;
                // we know there are at least two views to be loaded
                // before the app is ready (1-index.html 2-app*.html)
                if (viewsLoaded === 2) {
                    // with resolve this fires only once
                    //$timeout(function () {
                    //    deferred.resolve();
                    //}, 3000);
                    off();
                }

            });
            return deferred.promise;
        }

    }

})();