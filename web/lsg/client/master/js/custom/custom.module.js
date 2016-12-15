(function() {
    'use strict';

    angular
        .module('custom', [
            // from the framework
            'app.core',
            // 'app.sidebar', CUSTOMIZED
            'app.navsearch',
            // 'app.preloader', CUSTOMIZED
            'app.loadingbar',
            'app.translate',
            // 'app.settings', CUSTOMIZED
            'app.maps',
            'app.utils',
            'app.material',
            'app.notify',

            // custom modules
            'app.routes',
            'app.charts',
            'app.customSettings',
            'app.preloader',
            'app.sidebar',
            'app.games',
            'app.users',
            'app.matches',
            'app.requests',
            'app.archived',
            'app.welcome',
            'app.dashboard',
            'app.pages'
        ])
        .config(function($httpProvider) {
            $httpProvider.defaults.xsrfCookieName = 'csrftoken';
            $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
            $httpProvider.interceptors.push(mainHttpInterceptor);

        })
        .factory('globalFunctions', function() {
            var services = {
                getIndexByObjectAttribute: function(list, attr, value) {
                    for (var k = 0; k < list.length; k++) {
                        if (list[k][attr] == value) {
                            return k;
                        }
                    }
                }
            };
            return services;
        });


    var mainHttpInterceptor = function($q, Notify) {
        var connectionIssue = false;
        return {
            'request': function(config) {
                if (config.url.slice(0,5) == '/api/' && config.method != 'GET') {
                    if (!/^\/api\/users\/\d+\/$/.test(config.url)) {
                        $('#spinner').fadeIn();
                    }
                }
                return config;
            },
            'requestError': function(rejection) {
                console.log("Request rejection!");
                console.log(rejection);
                $('#spinner').hide();
                return $q.reject(rejection);
            },
            'response': function(response) {
                $('#spinner').hide();
                if (connectionIssue) {
                    Notify.closeAll('connectionIssue', true);
                    Notify.alert("Connection re-established!", {status: 'success', timeout: 2000});
                    connectionIssue = false;
                }
                return response;
            },
            'responseError': function(rejection) {
                console.log("Response rejection!");
                console.log(rejection);
                if (rejection.status == -1) {
                    $('#spinner').fadeIn();
                    connectionIssue = true;
                    Notify.closeAll('connectionIssue', true);
                    Notify.alert("Connection issue, attempting to re-establish it.", {
                        status: 'danger',
                        timeout: 60000,
                        group: 'connectionIssue'
                    });
                } else if (rejection.status == 403) {
                    console.log('Probably logged out.');
                    window.location = '/app/'
                } else {
                    $('#spinner').hide();
                }
                return $q.reject(rejection);
            }
        };
    }

})();
