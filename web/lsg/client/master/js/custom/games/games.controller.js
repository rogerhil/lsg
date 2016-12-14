
(function() {
    'use strict';

    angular
        .module('app.games', ['ngAnimate'])
        .controller('GamesCtrl', GamesCtrl)
        ;

    /*
      GamesCtrl
     */
    GamesCtrl.$inject = ['$scope', '$mdDialog', 'GamesService', 'UsersService', '$stateParams', '$timeout', 'GlobalFixes', '$rootScope', 'Utils'];
    function GamesCtrl($scope, $mdDialog, GamesService, UsersService, $stateParams, $timeout, GlobalFixes, $rootScope, Utils) {
        var self = this;

        self.scrollable = false;
        self.selectedItem = null;
        self.searchText = null;
        self.isDisabled = false;
        self.collection = [];
        self.wishlist = [];
        self.popularPlatforms = [];
        self.retroPlatforms = [];
        self.loaded = {collection: false, wishlist: false};
        self.tour = null;
        self.pinned = undefined;
        self.isMobile = Utils.isMobile();
        self.currentPlatform = $rootScope.lastSelectedPlatform;

        $(document).unbind('on');
        $(document).on("mousewheel",function(e){
            var scroll = $('.platform-games').scrollLeft();
            if (scroll <= 0) {
              if (self.scrollable && scroll <= 0 && e.originalEvent.wheelDeltaX >= 3) {
                e.preventDefault();
              }
            }
        });


        $('body').on('click', function (e) {
            //if ($(e.target).hasClass('tour-backdrop')) {
            //    if (self.tour) self.tour.end();
            //}
        });
        $(document).on('keyup',function(evt) {
            if (evt.keyCode == 27) {
                if (self.tour) self.tour.end();
            }
        });

        self.selectPlatform = function (context) {
            if (self.currentPlatform != self.pinned) {
                self.pinned = '';
            }
            $rootScope.lastSelectedPlatform = self.currentPlatform;
            $('form.' + context).find('md-autocomplete input').focus();
            $timeout(function () {
                $('form.' + context).find('md-autocomplete input').focus();
            }, 100);

        };

        GamesService.getPlatforms().then(function (platforms) {
            self.popularPlatforms = platforms[0];
            self.retroPlatforms = platforms[1];
        });

        UsersService.getCollection().then(function (collection) {
            self.loaded.collection = true;
            self.collection = collection;
            $timeout(function () {
                if (self.wishlist) {
                    $('.platform-games').unbind('scroll').scroll(updateScrollFades);
                }
            }, 500);
        });
        UsersService.getWishlist().then(function (wishlist) {
            self.loaded.wishlist = true;
            self.wishlist = wishlist;
            $timeout(function () {
                if (self.collection) {
                    $('.platform-games').unbind('scroll').scroll(updateScrollFades);
                }
            }, 500);
        });

        self.gameTour = function () {
            $timeout(self.runGameTour, 1000);
        };

        Tour.prototype._showPopover = GlobalFixes.hackTour_showPopover;

        self.runGameTour = function () {
            if (!$stateParams.tour) {
                return;
            }
            // BootstrapTour is not compatible with z-index based layout
            // so adding position:static for this case makes the browser
            // to ignore the property
            var section = angular.element('.wrapper > section');
            section.css({'position': 'static'});
            // finally restore on destroy and reuse the value declared in stylesheet
            $scope.$on('$destroy', function(){
                section.css({'position': ''});
            });
            self.tour = new Tour({
                backdrop: true,
                onHide: function () {
                    //console.log(222);
                    //self.called = false;
                    //console.log(self.called);
                },
                //backdropContainer: 'header.topnavbar-wrapper',
                //container: 'header.topnavbar-wrapper',
                template: "" +
                    "<div class='popover tour'>" +
                    "  <div class='arrow'></div>" +
                    "  <h3 class='popover-title'></h3>" +
                    "  <div class='popover-content'></div>" +
                    "  <div class='popover-navigation'>" +
                    "    <button class='btn btn-default' data-role='prev'>« Prev</button>" +
                    "    <button class='btn btn-default' data-role='next'>Next »</button>" +
                    "    <button class='btn btn-default' data-role='end'>Close</button>" +
                    "  </div>" +
                    "</div>",
                steps: [
                {
                    element: '.card.collection-card',
                    title: "My games collection",
                    content: "Add your own games by searching in the field above.",
                    placement: 'bottom'
                },
                {
                    element: '.card.wishlist-card',
                    title: "My wish list",
                    content: "Add the games you wish by searching in the field above.",
                    placement: 'bottom'
                },
                {
                    element: 'li[sref="app.matches"]',
                    title: "Matches",
                    content: "Check if there is any match.",
                    placement: 'right',
                    onShow: function (tour) {
                        $rootScope.app.asideToggled = true;
                        GlobalFixes.fixTourLeftMenu(self.tour);
                        $timeout(function () {
                            $('nav.sidebar');
                        }, 100);
                    },
                    onHide: function (tour) {
                        $rootScope.app.asideToggled = false;
                        $rootScope.$apply();
                    }
                }
            ]});
            self.tour.init();
            self.tour.start();
            self.tour.restart(true);

        };

        self.getItems = function (context) {
            return self[context];  // self.collection OR self.wishlist
        };

        function getGamesIds(games) {
            var gameIds = games.reduce(function (reduced, platform_items) {
                var items = platform_items && platform_items.items ? platform_items.items.map(function (o) {return o.game.id}) : [];
                return reduced.concat(items);
            }, []);
            return gameIds;
        }

        self.querySearch = function (query, context) {
            var gameIds = getGamesIds(self[context]);
            return GamesService.query(query, gameIds, self.currentPlatform);
        };

        function updatePopever(context) {
            for (var k = 1; k < 7; k++) {
                $timeout(function () {
                    var $card = $('.' + context + '-card ');
                    $('.popover.tour').css('top', ($card.offset().top + $card.height()) + 'px');
                    $('.tour-step-background').css('height', $card.height() + 'px');
                }, 100 * k);
            }
        }

        self.scrolling = false;

        self.scrollableWidth;
        self.scrollableWidthClearPromise;

        self.scroll = function (context, platformId, direction) {
            if (self.isMobile) {
                // disable this feature in mobile devices
                return;
            }
            self.scrolling = true;
            var scrollIn = $('#platform-games-' + context + '-' + platformId);
            var scrollOut = scrollIn.parent();
            scrollOut.animate({
                scrollLeft: direction + "=3px"
            }, 1, function() {
                if (self.scrolling) {
                    // If we want to keep scrolling, call the scrollContent function again:
                    self.scroll(context, platformId, direction);
                }
            });
        };

        function getScrollableWidth(sb) {
            var nsb = sb.clone();
            nsb.css('position', 'absolute');
            nsb.css('left', '-999999999px');
            $('body').append(nsb);
            var width = nsb.outerWidth();
            nsb.remove();
            return width;
        }

        function updateScrollFades() {
            var left = $(this).parent().find('.fade-left');
            var right = $(this).parent().find('.fade-right');
            if (!self.scrollableWidth) {
                self.scrollableWidth = getScrollableWidth($(this).find('.scrollable-block'));
            }
            var maxScroll = self.scrollableWidth - $(this).outerWidth() - 42;
            if ($(this).scrollLeft() < 2) {
                left.addClass('fade-out');
            } else {
                left.removeClass('fade-out');
            }
            if ($(this).scrollLeft() >= maxScroll) {
                right.addClass('fade-out');
            } else {
                right.removeClass('fade-out');
            }
            $timeout.cancel(self.scrollableWidthClearPromise);
            self.scrollableWidthClearPromise = $timeout(function () {
                self.scrollableWidth = undefined;
            }, 2000);
        }

        self.scrollStop = function () {
            self.scrolling = false;
        };

        function scrollToGame(context, game, platform_items) {
            var scrollIn = $('#platform-games-' + context + '-' + game.game.platform.id);
            var scrollOut = scrollIn.parent();
            var outWidth = scrollOut.outerWidth();
            var inWidth = getScrollableWidth(scrollIn);
            var num = platform_items.items.length;
            var p = inWidth / num;
            var index = platform_items.items.map(function (o) {return o.id}).indexOf(game.id);
            var v;
            if (((num - index) * p) <= outWidth) {
                v = inWidth + p;
                scrollOut.scrollLeft(0);
                scrollOut.animate({
                    scrollLeft: "+=" + v + "px"
                }, 150);
            } else {
                v = p * (index + 1) - (outWidth / 2);
                scrollOut.scrollLeft(0);
                scrollOut.animate({
                    scrollLeft: "+=" + v + "px"
                }, 150);
            }
        }

        self.addGameTo = function (context) {
            if (!self.selectedItem) return;
            var ids = getGamesIds(self[context]);
            if (self.selectedItem.value in ids) return;
            UsersService.addGameTo(self.selectedItem.value, context).then(function (game) {
                var platform_items;
                for (var k = 0; k < self[context].length; k++) {
                    platform_items = self[context][k];
                    var found = false;
                    if (game.game.platform.id == platform_items.platform.id) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    platform_items = {platform: game.game.platform, items: []};
                    self[context].push(platform_items);
                    self[context].sort(function (a, b) {
                    return a.platform.short_name.localeCompare(b.platform.short_name);
                });
                }
                platform_items.items.push(game);
                platform_items.items.sort(function (a, b) {
                    return a.game.name.localeCompare(b.game.name);
                });
                self.selectedItem = null;
                self.searchText = null;
                updatePopever(context);
                scrollToGame(context, game, platform_items);

            }, function (errors) {
                var reasons = [];
                for (var k in errors) {
                    reasons.push(errors[k]);
                }
                $mdDialog.show(
                    $mdDialog.alert()
                    .clickOutsideToClose(true)
                    .title('Cannot add game')
                    .textContent(reasons.join(' '))
                    .ariaLabel('Cannot add game')
                    .ok('Ok')
                );
            });
        };
        self.removeGameFrom = function (itemId, platformId, context) {
            UsersService.removeGameFrom(itemId,  context).then(function (response) {
                for (var k = 0; k < self[context].length; k++) {
                    var platform_items = self[context][k];
                    if (platform_items.platform.id == platformId) {
                        var items = platform_items.items.filter(function (o) {return o.id != itemId});
                        if (items.length) {
                            self[context][k].items = items;
                        } else {
                            self[context].splice(k, 1);
                        }
                        updatePopever(context);
                        break;
                    }
                }
            }, function (errors) {
                var reasons = [];
                for (var k in errors) {
                    reasons.push(errors[k]);
                }
                $mdDialog.show(
                    $mdDialog.alert()
                    .clickOutsideToClose(true)
                    .title('Cannot remove game')
                    .textContent(reasons.join(' '))
                    .ariaLabel('Cannot remove game')
                    .ok('Ok')
                );
            });
        }
    }

})();
