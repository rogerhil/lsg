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

        this.preFixTourLeftMenu = function (menuElement) {
            var windowHeight = $(window).height();
            var scrollTo = menuElement.offset().top - windowHeight/2;
            $('nav.sidebar').scrollTop(scrollTo);
        };

        this.fixTourLeftMenu = function (tour) {
            $timeout(function () {
                var el = $('.tour-tour-element');
                if (!el.length) return;
                if ($('.tour-step-background nav.sidebar').length) return;
                $('.tour-step-background').css('width', '225px');
                $('.tour-step-background').append($('<nav class="sidebar" style="width: 225px; overflow: hidden; border-radius: 5px;"><ul class="nav ng-scope">' + el[0].outerHTML + '</ul></nav>'));
                $('.tour-step-background').css('background', '#fff');

                $('.tour-step-background').click(function (e) {
                    $('.tour-step-background').html('');
                    tour.end();
                });
            }, 700);
        };

        this.closeAllTours = function () {
            $('.popover.tour').remove();
            $('.tour-backdrop').remove();
        };

        this.hackTour_showPopover = function (step, i) {
            if (this._current == i && $(".tour-" + this._options.name).length) {
                //self.called = false;
                return;
            }
            var $element, $tip, isOrphan, options, shouldAddSmart;
            $(".tour-" + this._options.name).remove();
            options = $.extend({}, this._options);
            isOrphan = this._isOrphan(step);
            step.template = this._template(step, i);
            if (isOrphan) {
                step.element = 'body';
                step.placement = 'top';
            }
            $element = $(step.element);
            $element.addClass("tour-" + this._options.name + "-element tour-" + this._options.name + "-" + i + "-element");
            if (step.options) {
                $.extend(options, step.options);
            }
            if (step.reflex && !isOrphan) {
                $(step.reflexElement).addClass('tour-step-element-reflex').off("" + (this._reflexEvent(step.reflex)) + ".tour-" + this._options.name).on("" + (this._reflexEvent(step.reflex)) + ".tour-" + this._options.name, (function (_this) {
                    return function () {
                        if (_this._isLast()) {
                            return _this.next();
                        } else {
                            return _this.end();
                        }
                    };
                })(this));
            }
            shouldAddSmart = step.smartPlacement === true && step.placement.search(/auto/i) === -1;
            $element.popover({
                placement: shouldAddSmart ? "auto " + step.placement : step.placement,
                trigger: 'manual',
                title: step.title,
                content: step.content,
                html: true,
                animation: step.animation,
                container: step.container,
                template: step.template,
                selector: step.element
            }).popover('show');
            $tip = $element.data('bs.popover') ? $element.data('bs.popover').tip() : $element.data('popover').tip();
            $tip.attr('id', step.id);
            this._focus($tip, $element, step.next < 0);
            this._reposition($tip, step);
            self.called = true;
            if (isOrphan) {
                return this._center($tip);
            }
        };
    }
})();
