(function () {
    'use strict';

    angular
        .module('app.games')
        .directive('platformSelect', platformSelect);

    /*
     platformSelect
     */
    platformSelect.$inject = [];
    function platformSelect () {
        var controller = ['$scope', '$timeout', 'GamesService', function ($scope, $timeout, GamesService) {
            $scope.popularPlatforms = [];
            $scope.retroPlatforms = [];
            GamesService.getPlatforms().then(function (platforms) {
                $scope.popularPlatforms = platforms[0];
                $scope.retroPlatforms = platforms[1];
            });

            $scope.selectPlatform = function (parentctrl, context) {
                parentctrl.selectPlatform(context);
            };

            $scope.selectPlatformOpen = function (context) {
                var base;
                var hprop = 'left';
                if (context[0] == '.') {
                    base = $(context);
                    hprop = 'right';
                } else {
                    base = $("." + context + "-card");
                }
                var select = base.find("md-select");
                var top = select.offset().top + 45 - $(window).scrollTop();
                var hpropValue = base.offset()[hprop];
                var max = $(window).height() - $('.md-select-menu-container').height() - 5;
                var moved = false;
                if (top >= max) {
                    top = max;
                }
                if ($(window).width() >= 768) {
                    hprop += 22;
                }
                for (var k = 0; k < 30; k++) {
                    $timeout(function () {
                        // if (!$('.md-select-menu-container').length || moved) {
                        //     return
                        // }
                        $('.md-select-menu-container.md-active').css(hprop, hpropValue + 'px');
                        $('.md-select-menu-container.md-active').css('top', top + 'px');
                        moved = true;
                    }, 10 * k + 1);
                }
            };


        }];

        return {
            restrict: 'E',
            scope: {
                placeholder: '=',
                context: '=',
                parentctrl: '=',
                allowall: '='
            },
            controller: controller,
            templateUrl: 'app/views/games/directives/platform-select.html'
        }
    }
})();
