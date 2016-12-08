
(function() {
    'use strict';

    angular
        .module('app.games', ['ngAnimate'])
        .controller('GamesCtrl', GamesCtrl)
        ;

    /*
      GamesCtrl
     */
    GamesCtrl.$inject = ['$scope', '$mdDialog', 'GamesService', 'UsersService', '$stateParams', '$timeout', 'GlobalFixes', '$rootScope'];
    function GamesCtrl($scope, $mdDialog, GamesService, UsersService, $stateParams, $timeout, GlobalFixes, $rootScope) {
        var self = this;

        self.scrollable = false;
        self.selectedItem = null;
        self.searchText = null;
        self.isDisabled = false;
        self.collection = [];
        self.wishlist = [];
        self.loaded = {collection: false, wishlist: false};
        self.tour = null;

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

        UsersService.getCollection().then(function (collection) {
            self.loaded.collection = true;
            self.collection = collection;
        });
        UsersService.getWishlist().then(function (wishlist) {
            self.loaded.wishlist = true;
            self.wishlist = wishlist;
        });

        self.gameTour = function () {
            $timeout(self.runGameTour, 1000);
        };

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
                var items = platform_items && platform_items[1] ? platform_items[1].map(function (o) {return o.game.id}) : [];
                return reduced.concat(items);
            }, []);
            return gameIds;
        }

        self.querySearch = function (query, context) {
            var gameIds = getGamesIds(self[context]);
            return GamesService.query(query, gameIds);
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

        self.addGameTo = function (context) {
            if (!self.selectedItem) return;
            var ids = getGamesIds(self[context]);
            if (self.selectedItem.value in ids) return;
            UsersService.addGameTo(self.selectedItem.value, context).then(function (game) {
                var platform_items;
                for (var k = 0; k < self[context].length; k++) {
                    platform_items = self[context][k];
                    var found = false;
                    if (game.game.platform.short_name == platform_items[0]) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    platform_items = [game.game.platform.short_name, []];
                    self[context].push(platform_items);
                    self[context].sort();

                }
                platform_items[1].push(game);
                platform_items[1].sort(function (a, b) {
                    return a.game.name > b.game.name;
                });
                self.selectedItem = null;
                self.searchText = null;
                updatePopever(context);


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
        self.removeGameFrom = function (itemId, platformShortname, context) {
            UsersService.removeGameFrom(itemId,  context).then(function (response) {
                for (var k = 0; k < self[context].length; k++) {
                    var platform_items = self[context][k];
                    if (platform_items[0] == platformShortname) {
                        var items = platform_items[1].filter(function (o) {return o.id != itemId});
                        if (items.length) {
                            self[context][k][1] = items;
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
