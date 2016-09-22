/**=========================================================
 * Module: config.js
 * App routes and resources configuration
 =========================================================*/


(function () {
    'use strict';

    angular
        .module('app.routes')
        .config(routesConfig);

    routesConfig.$inject = ['$stateProvider', '$locationProvider', '$urlRouterProvider', 'RouteHelpersProvider'];
    function routesConfig($stateProvider, $locationProvider, $urlRouterProvider, helper) {

        // Set the following to true to enable the HTML5 Mode
        // You may have to set <base> tag in index and a routing configuration in your server
        $locationProvider.html5Mode(false);

        $stateProvider.decorator('parent', function (internalStateObj, parentFn) {
             // This fn is called by StateBuilder each time a state is registered

             // The first arg is the internal state. Capture it and add an accessor to public state object.
             internalStateObj.self.$$state = function() { return internalStateObj; };

             // pass through to default .parent() function
             return parentFn(internalStateObj);
        });

        // defaults to dashboard
        $urlRouterProvider.otherwise('/app/welcome');

        //
        // Application Routes
        // -----------------------------------   
        $stateProvider
            .state('app', {
                url: '/app',
                abstract: true,
                templateUrl: helper.basepath('app.html'),
                resolve: helper.resolveFor('modernizr', 'icons')
            })
            .state('app.welcome', {
                url: '/welcome',
                title: 'Welcome',
                templateUrl: helper.basepath('welcome.html'),
                resolve: helper.resolveFor('bm.bsTour')
            })
            .state('pages', {
                url: '',
                abstract: true,
                templateUrl: helper.basepath('single-page.html'),
                resolve: helper.resolveFor('modernizr', 'icons'),
                controller: ['$rootScope', function($rootScope) {
                    $rootScope.app.layout.isBoxed = false;
                }]
            })
            .state('pages.signIn', {
                url: '/sign-in?next',
                title: 'Sing In',
                templateUrl: 'app/views/pages/sign-in.html'
            })
            .state('pages.500', {
                url: '/500',
                title: 'Oh! Something went wrong',
                templateUrl: 'app/views/pages/500.html'
            })
            //
            // Material
            // -----------------------------------
            .state('app.dashboard', {
                url: '/dashboard',
                title: 'Dashboard',
                templateUrl: helper.basepath('dashboard/main.html'),
                resolve: helper.resolveFor('flot-chart', 'flot-chart-plugins', 'weather-icons', 'sparklines', 'classyloader')
            })
            .state('app.games', {
                url: '/games?tour',
                title: 'Games',
                templateUrl: helper.basepath('games/main.html'),
                resolve: helper.resolveFor('bm.bsTour')
            })
            .state('app.users', {
                url: '/profile',
                title: 'Profile',
                templateUrl: helper.basepath('users/main.html'),
                resolve: helper.resolveFor('ngImgCrop', 'bm.bsTour', 'loadGoogleMapsJS', function() { return loadGoogleMaps('3.2', 'AIzaSyAEwl1BoNGyJdvc80qaBylRntj-3b-dJ6A', 'en'); }, 'ui.map')
            })
            .state('app.matches', {
                url: '/matches',
                title: 'Matches',
                templateUrl: helper.basepath('matches/main.html')
            })
            .state('app.requests', {
                url: '/requests?id&msg',
                title: 'Requests',
                templateUrl: helper.basepath('requests/main.html'),
                resolve: helper.resolveFor('loaders.css', 'spinkit', 'bm.bsTour', 'loadGoogleMapsJS', function() { return loadGoogleMaps('3.2', 'AIzaSyAEwl1BoNGyJdvc80qaBylRntj-3b-dJ6A', 'en'); }, 'ui.map')
            })
            .state('app.archived', {
                url: '/requests/archived',
                title: 'Archived Requests',
                templateUrl: helper.basepath('requests/archived/main.html'),
                resolve: helper.resolveFor('ngTable')
            })

            .state('app.cards', {
                url: '/cards',
                title: 'Material Cards',
                templateUrl: helper.basepath('material.cards.html')
            })
            .state('app.forms', {
                url: '/forms',
                title: 'Material Forms',
                templateUrl: helper.basepath('material.forms.html')
            })
            .state('app.whiteframe', {
                url: '/whiteframe',
                title: 'Material Whiteframe',
                templateUrl: helper.basepath('material.whiteframe.html')
            })
            .state('app.matcolors', {
                url: '/matcolors',
                title: 'Material Colors',
                templateUrl: helper.basepath('material.colors.html')
            })
            .state('app.lists', {
                url: '/lists',
                title: 'Material Lists',
                templateUrl: helper.basepath('material.lists.html')
            })
            .state('app.inputs', {
                url: '/inputs',
                title: 'Material Inputs',
                templateUrl: helper.basepath('material.inputs.html')
            })
            .state('app.matwidgets', {
                url: '/matwidgets',
                title: 'Material Widgets',
                templateUrl: helper.basepath('material.widgets.html'),
                resolve: helper.resolveFor('weather-icons', 'loadGoogleMapsJS', function () {
                    return loadGoogleMaps();
                }, 'ui.map')
            })
            .state('app.ngmaterial', {
                url: '/ngmaterial',
                title: 'ngMaterial',
                templateUrl: helper.basepath('material.ngmaterial.html')
            });

        //
        // CUSTOM RESOLVES
        //   Add your own resolves properties
        //   following this object extend
        //   method
        // -----------------------------------
        // .state('app.someroute', {
        //   url: '/some_url',
        //   templateUrl: 'path_to_template.html',
        //   controller: 'someController',
        //   resolve: angular.extend(
        //     helper.resolveFor(), {
        //     // YOUR RESOLVES GO HERE
        //     }
        //   )
        // })
        ;

    } // routesConfig

})();

