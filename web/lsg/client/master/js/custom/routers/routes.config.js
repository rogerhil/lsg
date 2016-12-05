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
                resolve: helper.resolveFor('loaders.css', 'spinkit', 'modernizr', 'icons')
            })
            .state('app.welcome', {
                url: '/welcome',
                title: 'Welcome',
                templateUrl: helper.basepath('welcome.html'),
                resolve: helper.resolveFor('loaders.css', 'spinkit', 'bm.bsTour')
            })
            .state('pages', {
                url: '',
                abstract: true,
                templateUrl: helper.basepath('single-page.html'),
                resolve: helper.resolveFor('loaders.css', 'spinkit', 'modernizr', 'icons'),
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
            .state('pages.400', {
                url: '/400',
                title: 'Oh! Bad request',
                templateUrl: 'app/views/pages/400.html'
            })
            .state('pages.403', {
                url: '/403',
                title: 'Forbidden!',
                templateUrl: 'app/views/pages/403.html'
            })
            //
            // Material
            // -----------------------------------
            .state('app.dashboard', {
                url: '/dashboard',
                title: 'Dashboard',
                templateUrl: helper.basepath('dashboard/main.html'),
                resolve: helper.resolveFor('loaders.css', 'spinkit', 'flot-chart', 'flot-chart-plugins', 'weather-icons', 'sparklines', 'classyloader')
            })
            .state('app.games', {
                url: '/games?tour',
                title: 'Games',
                templateUrl: helper.basepath('games/main.html'),
                resolve: helper.resolveFor('loaders.css', 'spinkit', 'bm.bsTour')
            })
            .state('app.users', {
                url: '/profile',
                title: 'Profile',
                templateUrl: helper.basepath('users/main.html'),
                resolve: helper.resolveFor('loaders.css', 'spinkit', 'ngImgCrop', 'bm.bsTour', 'loadGoogleMapsJS', function() { return loadGoogleMaps('3.2', 'AIzaSyAEwl1BoNGyJdvc80qaBylRntj-3b-dJ6A', 'en'); }, 'ui.map')
            })
            .state('app.matches', {
                url: '/matches',
                title: 'Matches',
                templateUrl: helper.basepath('matches/main.html'),
                resolve: helper.resolveFor('loaders.css', 'spinkit')
            })
            .state('app.requests', {
                url: '/requests?id&msg&my&inc',
                title: 'Requests',
                templateUrl: helper.basepath('requests/main.html'),
                resolve: helper.resolveFor('loaders.css', 'spinkit', 'bm.bsTour', 'loadGoogleMapsJS', function() { return loadGoogleMaps('3.2', 'AIzaSyAEwl1BoNGyJdvc80qaBylRntj-3b-dJ6A', 'en'); }, 'ui.map')
            })
            .state('app.archived', {
                url: '/requests/archived',
                title: 'Archived Requests',
                templateUrl: helper.basepath('requests/archived/main.html'),
                resolve: helper.resolveFor('loaders.css', 'spinkit', 'ngTable')
            })
            .state('app.contact', {
                url: '/contact',
                title: 'Contact',
                templateUrl: helper.basepath('contact/main.html')
            })
            .state('app.invite', {
                url: '/invite',
                title: 'Invite',
                templateUrl: helper.basepath('invite/main.html')
            })

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

