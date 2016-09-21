(function () {
    'use strict';

    angular
        .module('app.preloader')
        .directive('preloader', preloader);

    preloader.$inject = ['$animate', '$timeout', '$q', '$http', 'lsgConfig', '$rootScope', 'Notify', '$state', '$stateParams'];
    function preloader($animate, $timeout, $q, $http, lsgConfig, $rootScope, Notify, $state, $stateParams) {
        var counter = 0;
        var timeout;

        var locationChange = function (event, next, current) {
            var splitted = next.split('#');
            var el = angular.element(".preloader-progress").parent();
            if (splitted.length > 1 && (splitted[1] == '/500' || splitted[1].slice(0, 8) == '/sign-in')) {
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

        $rootScope.$on('$locationChangeError', function (event) {
            console.log('?????????????????');
            console.log(event);
            $state.transitionTo("pages.signIn");
        });

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
                    // angular.forEach($state.get(), function(state) {
                    //     console.log(state.$$state);
                    //     return;
                    //     //var privatePortion = state.$$state();
                    //     var match = state.url.exec(sref);
                    //     if (match) console.log("Matched state: " + state.name + " and parameters: " + match);
                    // });
                    $state.transitionTo("pages.signIn");
                    //$state.transitionTo("app.games");
                    $timeout(function () {
                        window.location = sref;
                        endCounter(scope, el);
                    }, 300);
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

        function loadAuthenticatedUser(event) {
            var q = $q.defer();
            if (event && event.targetScope && event.targetScope.user != undefined && event.targetScope.user != null) {
                q.resolve(event.targetScope.user);
                return q;
            }
            $http.get('/api/users/authenticated/').success(function (response) {
                var user = response;
                lsgConfig.authenticatedUser = user;
                $rootScope.user = user;
                if (user) {
                    q.resolve(user);
                } else {
                    if (event) {
                        event.preventDefault();
                    }
                    redirectToSignInPage();
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

                $rootScope.$on('$stateChangeStart',  function(event, toState, toParams, fromState, fromParams) {
                    if (!lsgConfig.authenticatedUser.address.latitude || !lsgConfig.authenticatedUser.address.longitude) {
                        initialAlert();
                    }
                });

            }).error(function (response, status) {
                console.log('Failed to get authenticated user');
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