
(function() {
    'use strict';

    angular
        .module('app.browse', ['ngAnimate'])
        .controller('BrowseCtrl', BrowseCtrl)
        .controller('GameDetailsDialogCtrl', GameDetailsDialogCtrl)
        ;

    /*
      BrowseCtrl
     */
    BrowseCtrl.$inject = ['$scope', '$mdMedia', '$mdDialog', '$timeout', '$rootScope', 'BrowseService', 'UsersService'];
    function BrowseCtrl($scope, $mdMedia, $mdDialog, $timeout, $rootScope, BrowseService, UsersService) {
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
        var self = this;
        self.games = [];
        self.defaultFilter = '-owned_count,name,id';  // the id is very important to avoid repeated items in pages.
        self.selectedFilter = self.defaultFilter;
        self.currentPlatform = $rootScope.browseLastSelectedPlatform;
        self.page = 1;
        self.endOfList = false;
        self.loading = false;
        self.paginating = false;
        self.collection = [];
        self.wishlist = [];
        self.collectionIds = [];
        self.wishlistIds = [];

        function getGamesIds(games) {
            var gameIds = games.reduce(function (reduced, platform_items) {
                var items = platform_items && platform_items.items ? platform_items.items.map(function (o) {return o.game.id}) : [];
                return reduced.concat(items);
            }, []);
            return gameIds;
        }

        UsersService.getCollection().then(function (collection) {
            self.collection = collection;
            self.collectionIds = getGamesIds(collection);
        });
        UsersService.getWishlist().then(function (wishlist) {
            self.wishlist = wishlist;
            self.wishlistIds = getGamesIds(wishlist);
        });

        self.iHave = function (game) {
            if (!game.iHave) {
                game.iHave = self.collectionIds.indexOf(game.id) != -1;
            }
            return game.iHave;
        };

        self.iWant = function (game) {
            if (!game.iWant) {
                game.iWant = self.wishlistIds.indexOf(game.id) != -1;
            }
            return game.iWant;
        };

        self.loadGamesList = function (filter, concatenate) {
            self.loading = true;
            if (!concatenate) {
                self.page = 1;
                self.games = [];
            } else {
                self.paginating = true;
            }
            if (!filter) {
                filter = self.defaultFilter;
            }
            self.selectedFilter = filter;
            $timeout(function () {
                BrowseService.getGames(filter, self.currentPlatform, self.page).then(function (games) {
                    self.paginating = false;
                    if (concatenate) {
                        if (games.length) {
                            self.games = self.games.concat(games);
                        } else {
                            self.endOfList = true;
                        }
                    } else {
                        self.games = games;
                    }
                    self.loading = false;
                });
            }, 1);
        };

        self.loadMore = function () {
            //if (self.endOfList) return;
            self.page++;
            self.loadGamesList(self.selectedFilter, true);
        };

        self.loadGamesList();

        self.selectPlatform = function () {
            $rootScope.browseLastSelectedPlatform = self.currentPlatform;
            self.loadGamesList(self.selectedFilter);
        };

        self.showGameDetails = function (game) {
            $mdDialog.show({
                controllerAs: 'ctrl',
                controller: 'GameDetailsDialogCtrl',
                locals: {game: game, browseCtrl: self},
                templateUrl: 'app/views/browse/game-details.html',
                parent: angular.element(document.body),
                clickOutsideToClose: true,
                fullscreen: useFullScreen
            });
        };
    }

    /*
     GameDetailsDialogCtrl
     */
    GameDetailsDialogCtrl.$inject = ['$scope', '$mdDialog', 'game', '$mdMedia', 'browseCtrl'];
    function GameDetailsDialogCtrl($scope, $mdDialog, game, $mdMedia, browseCtrl) {
        var self = this;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
        self.game = game;
        self.close = function () {
            $mdDialog.hide();
        };
    }

})();
