
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
                    placement: 'right'
                },
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
