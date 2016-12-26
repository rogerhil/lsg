(function () {
    'use strict';

    angular
        .module('app.preloader')
        .directive('preloader', preloader);

    preloader.$inject = ['$animate', '$timeout', '$rootScope', '$state', 'UsersService', '$mdDialog'];
    function preloader($animate, $timeout, $rootScope, $state, UsersService, $mdDialog) {
        var counter = 0;

        var locationChange = function (event, next, current) {
            var currentSplitted = current.split('#');
            var nextSplitted = next.split('#');
            var el = angular.element(".preloader-progress").parent();

            // if (nextSplitted[1].slice(0, 12) == '/app/profile') {
            //     $rootScope.userBlockVisible = false;
            // } else {
            //     $rootScope.userBlockVisible = true;
            // }

            if (nextSplitted.length > 1) {
                var u = nextSplitted[1].replace(/^\s+|[\/\s]+$/g, '');
                switch (u) {
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

            if ($rootScope.user && $rootScope.user.deleted) {
                window.location = '/logout/';
                return;
            }

            if ($rootScope.user && !$rootScope.user.acceptedTerms()) {
                window.location = '/app/#/app/welcome';
                return;
            }

            if ($rootScope.user && !$rootScope.user.enabled) {
                window.location = '/';
                return;
            }
            if (nextSplitted.length > 1 && nextSplitted[1].slice(0, 8) == '/sign-in') {
                endCounter($rootScope, el);
                return;
            }
            if (currentSplitted[1] != nextSplitted) {
                // to update counts and stars in frontend..
                var prom = UsersService.updateUserCountsStarsDetails();
                if (prom) {
                    prom.then(function (user) {
                        if (user.app_updates && !user.no_reload_page) {
                            var confirm = $mdDialog.confirm()
                                .title('Updates Available!')
                                .textContent("It is highly recommended to reload the app. Do you want to do it now?")
                                .ariaLabel('Updates Available!')
                                .ok("Yes")
                                .cancel('No');
                            $mdDialog.show(confirm).then(function () {
                                $rootScope.user.no_reload_page = false;
                                window.location.reload(true);
                            }).catch(function () {
                                $rootScope.user.no_reload_page = true;
                            });
                        }
                    });
                }
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
                    var urlHashSplit = sref.split('#');
                    var u, split;
                    if (urlHashSplit.length > 1) {
                        split = urlHashSplit[1].split('?');
                        u = split[0];
                    }
                    if (u) {
                        for (var k = 0; k < states.length; k++) {
                            state = states[k];
                            if (!state.$$state) continue;
                            var privatePortion = state.$$state();
                            toParams = {};
                            var match = privatePortion.url.exec(u);
                            if (!match) {
                                match = privatePortion.url.exec(u.replace(/^\s+|[\/\s]+$/g, ''));
                            }
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
            var deferred = UsersService.loadAuthenticatedUser(event);
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