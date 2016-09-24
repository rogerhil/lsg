(function () {
    'use strict';

    angular
        .module('app.preloader')
        .directive('preloader', preloader);

    preloader.$inject = ['$animate', '$timeout', '$q', '$http', '$rootScope', 'Notify', '$state', '$stateParams'];
    function preloader($animate, $timeout, $q, $http, $rootScope, Notify, $state, $stateParams) {
        var counter = 0;
        var timeout;
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
            if (currentSplitted.length > 1) {
                switch (currentSplitted[1]) {
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
                    for (var k = 0; k < states.length; k++) {
                        state = states[k];
                        if (!state.$$state) continue;
                        var privatePortion = state.$$state();
                        var match = privatePortion.url.exec(sref.split('#')[1]);
                        if (match) {
                            matchedState = state;
                            break
                        }
                    }
                    if (matchedState) {
                        if (matchedState.name == 'pages.signIn') {
                            $state.transitionTo("app.welcome");
                        } else {
                            $state.transitionTo(matchedState.name);
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
                var user = response;
                $rootScope.user = user;
                if (user) {
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
                    if (!user.address.latitude || !user.address.longitude) {
                        Notify.closeAll(false, true);
                        Notify.alert("You need to provide your own address details in " +
                            "order to use the application. <a style='color: yellow;' href='#/app/profile'>" +
                            "Click here to access the profile form to update your " +
                            "address.</a>", {status: 'danger', timeout: 7000});
                    }
                };

                $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
                    if (toState.name == 'app.welcome' || toState.name == 'app.users') {
                        return;
                    }
                    if (!$rootScope.user.address.latitude || !$rootScope.user.address.longitude) {
                        initialAlert();
                    }
                });

            }).error(function (response, status) {
                if (status == 400) {
                    q.reject();
                    return;
                }
                q.resolve();
                $state.transitionTo("pages.500");
            });
            return q;
        }

        ///////

        function startCounter(scope) {
            var remaining = 100 - counter;
            counter = counter + (0.015 * Math.pow(1 - Math.sqrt(remaining), 2));
            scope.loadCounter = parseInt(counter, 10);
            timeout = $timeout(function () { startCounter(scope) }, 20);
        }

        function endCounter(scope, el) {
            $timeout.cancel(timeout);
            scope.loadCounter = 100;
            counter = 0;
            $timeout(function () {
                // animate preloader hiding
                $animate.addClass(el, 'preloader-hidden');
                // retore scrollbar
                angular.element('body').css('overflow', '');
            }, 300);
        }

        function startLoader(scope, el) {
            scope.loadCounter = 0;
            angular.element('body').css('overflow', 'hidden');
            el.addClass('preloader');
            timeout = $timeout(function () { startCounter(scope) });
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