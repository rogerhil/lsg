(function() {
    'use strict';

    angular
        .module('app.customSettings')
        .service('ConstantsService', ConstantsService)
        .service('GlobalFixes', GlobalFixes);

    ConstantsService.$inject = ['$q', '$http'];
    function ConstantsService($q, $http) {

        this.get = function () {
            var url = '/api/constants/';
            var q = $q.defer();
            $http.get(url).success(function (response) {
                q.resolve(response);
            });
            return q.promise;
        };

    }

    GlobalFixes.$inject = ['$timeout'];
    function GlobalFixes($timeout) {

        // Tour.prototype._reposition
        this._Tour_reposition = function ($tip, step) {
            var offsetBottom, offsetHeight, offsetRight, offsetWidth, originalLeft, originalTop, tipOffset;
            offsetWidth = $tip[0].offsetWidth;
            offsetHeight = $tip[0].offsetHeight;
            tipOffset = $tip.offset();
            originalLeft = tipOffset.left;

            if (typeof step.backdropPadding === 'object') {
                if (step.placement === 'bottom') {
                    tipOffset.top += step.backdropPadding.bottom;
                } else if (step.placement === 'top') {
                    tipOffset.top -= step.backdropPadding.top;
                } else if (step.placement === 'right') {
                    tipOffset.left += step.backdropPadding.right;
                } else {
                    tipOffset.left -= step.backdropPadding.left;
                }
            } else {
                if (step.placement === 'bottom') {
                    tipOffset.top += step.backdropPadding;
                } else if (step.placement === 'top') {
                    tipOffset.top -= step.backdropPadding;
                } else if (step.placement === 'right') {
                    tipOffset.left += step.backdropPadding;
                } else {
                    tipOffset.left -= step.backdropPadding;
                }
            }

            originalTop = tipOffset.top;
            offsetBottom = $(document).outerHeight() - tipOffset.top - $tip.outerHeight();

            if (offsetBottom < 0) {
                tipOffset.top = tipOffset.top + offsetBottom;
            }
            offsetRight = $('html').outerWidth() - tipOffset.left - $tip.outerWidth();
            if (offsetRight < 0) {
                tipOffset.left = tipOffset.left + offsetRight;
            }
            if (tipOffset.top < 0) {
                tipOffset.top = 0;
            }
            if (tipOffset.left < 0) {
                tipOffset.left = 0;
            }
            $tip.offset(tipOffset);
            if (step.placement === 'bottom' || step.placement === 'top') {
                if (originalLeft !== tipOffset.left) {
                    return this._replaceArrow($tip, (tipOffset.left - originalLeft) * 2, offsetWidth, 'left');
                }
            } else {
                if (originalTop !== tipOffset.top) {
                    return this._replaceArrow($tip, (tipOffset.top - originalTop) * 2, offsetHeight, 'top');
                }
            }
        };

        this.fixTourLeftMenu = function (tour) {
            $timeout(function () {
                $('.tour-step-background').append($('<nav class="sidebar" style="width: 150px; overflow: hidden;"><ul class="nav ng-scope">' + $('.tour-tour-element')[0].outerHTML + '</ul></nav>'));
                $('.tour-step-background').css('background', '#fff');
                $('.tour-step-background').click(function (e) {
                    tour.end();

                });
            }, 900);
        };
    }

})();
