
(function() {
    'use strict';

    angular
        .module('app.games', ['ngAnimate'])
        .controller('GamesCtrl', GamesCtrl)
        ;

    /*
      GamesCtrl
     */
    GamesCtrl.$inject = ['$scope', '$mdDialog', 'GamesService', 'UsersService', '$stateParams', '$timeout'];
    function GamesCtrl($scope, $mdDialog, GamesService, UsersService, $stateParams, $timeout) {
        var self = this;

        self.selectedItem = null;
        self.searchText = null;
        self.isDisabled = false;
        self.collection = [];
        self.wishlist = [];
        self.tour = null;

        $('body').on('click', function (e) {
            if ($(e.target).hasClass('tour-backdrop')) {
                if (self.tour) self.tour.end();
            }
        });
        $(document).on('keyup',function(evt) {
            if (evt.keyCode == 27) {
                if (self.tour) self.tour.end();
            }
        });

        UsersService.getCollection().then(function (collection) {
            self.collection = collection;
        });
        UsersService.getWishlist().then(function (wishlist) {
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
                        $timeout(function () {
                            $('.tour-step-background').append($('<nav class="sidebar" style="width: 150px;"><ul class="nav ng-scope">' + $('.tour-tour-element')[0].outerHTML + '</ul></nav>'));
                            $('.tour-step-background').css('background', '#fff');
                            $('.tour-step-background').click(function () {
                                self.tour.end();
                            });
                        }, 700);
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

        self.querySearch = function (query, context) {
            var gameIds = self[context].map(function (o) {return o.game.id});
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
            var ids = self[context].map(function (o) {return o.game.id});
            if (self.selectedItem.value in ids) return;
            UsersService.addGameTo(self.selectedItem.value, context).then(function (game) {
                self[context].push(game);
                self[context].sort(function (a, b) {
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
        self.removeGameFrom = function (itemId, context) {
            UsersService.removeGameFrom(itemId,  context).then(function (response) {
                self[context] = self[context].filter(function (o) {return o.id != itemId});
                updatePopever(context);
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
