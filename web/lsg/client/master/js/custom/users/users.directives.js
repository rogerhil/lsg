(function () {
    'use strict';

    angular
        .module('app.users')
        .directive('userRatings', userRatings)
        .directive('userPhotoRatingsDistance', userPhotoRatingsDistance);

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
     userPhotoRatingsDistance
     */
    userPhotoRatingsDistance.$inject = [];
    function userPhotoRatingsDistance () {
        return {
            restrict: 'E',
            scope: {
                user: '=',
                distance: '='
            },
            templateUrl: 'app/views/users/directives/user-photo-ratings-distance.html'
        }
    };


})();
