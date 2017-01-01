
(function() {
    'use strict';

    angular
        .module('app.browse', ['ngAnimate'])
        .controller('BrowseCtrl', BrowseCtrl)
        .controller('GameDetailsDialogCtrl', GameDetailsDialogCtrl)
        ;

    function getGamesIds(games) {
        var gameIds = games.reduce(function (reduced, platform_items) {
            var items = platform_items && platform_items.items ? platform_items.items.map(function (o) {return o.game.id}) : [];
            return reduced.concat(items);
        }, []);
        return gameIds;
    }

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
    GameDetailsDialogCtrl.$inject = ['$scope', '$rootScope', '$mdDialog', 'game', '$mdMedia', 'browseCtrl', 'Notify', 'UsersService', '$timeout', 'BrowseService', '$state'];
    function GameDetailsDialogCtrl($scope, $rootScope, $mdDialog, game, $mdMedia, browseCtrl, Notify, UsersService, $timeout, BrowseService, $state) {
        var self = this;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

        self.game = game;
        self.ownedBy = [];
        self.wantedBy = [];
        self.usersMap = undefined;
        self.usersMapOptions = {
            zoom: 14,
            //center: userPosition,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            scrollwheel: false
        };
        self.circles = [];


        BrowseService.gameOwnedBy(self.game.id).then(function (users) {
            self.ownedBy = users;

        });

        BrowseService.gameWantedBy(self.game.id).then(function (users) {
            self.wantedBy = users;
            if (self.game.owned_count || self.game.wanted_count) {
                $timeout(function () {
                    setupUsersMap();
                }, 1000);
            }
        });

        self.close = function () {
            $mdDialog.hide();
        };

        self.checkoutMatches = function () {
            self.close();
            $timeout(function () {
                $state.transitionTo("app.matches");
            }, 500);
        };

        self.addGameTo = function (context) {
            UsersService.addGameTo(self.game.id, context).then(function (game) {
                var title = context;
                if (context == 'collection') {
                    self.game.iHave = true;
                    self.game.owned_count++;
                    self.ownedBy.push($rootScope.user);
                } else {
                    self.game.iWant = true;
                    self.game.wanted_count++;
                    title = 'wish list';
                    self.wantedBy.push($rootScope.user);
                }
                resetMap();
                setupUsersMap();
                Notify.alert('The game "' + self.game.full_name + '" was successfully added to your ' + title,
                             {status: 'success', timeout: 5000});
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

        function resetMap() {
            for (var i = 0; i < self.circles.length; i++) {
                self.circles[i].setMap(null);
            }
            self.circles = [];
        }

        function setupUsersMap() {
            var bounds = new google.maps.LatLngBounds();
            var radius = [14, 18, 15, 17, 16];  // km

            self.usersMapOptions = {
                zoom: 14,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                scrollwheel: false
            };

            $timeout(function () {

                for (var k = 0; k < self.ownedBy.length; k++) {
                    var user = self.ownedBy[k];
                    var userPosition = new google.maps.LatLng(user.address.city_latitude, user.address.city_longitude);
                    var circle = new google.maps.Circle({
                        map: self.usersMap,
                        radius: radius[k % 5] * 1000,
                        fillColor: '#ff9800',
                        strokeWeight: 1,
                        strokeColor: '#000',
                        center: userPosition
                    });

                    self.circles.push(circle);
                    bounds.union(circle.getBounds());
                }

                for (var k = 0; k < self.wantedBy.length; k++) {
                    var user = self.wantedBy[0];
                    var userPosition = new google.maps.LatLng(user.address.city_latitude, user.address.city_longitude);
                    var circle = new google.maps.Circle({
                        map: self.usersMap,
                        radius: radius[k % 5] * 1000,
                        fillColor: '#E91E63',
                        strokeWeight: 1,
                        strokeColor: '#000',
                        center: userPosition
                    });
                    self.circles.push(circle);
                    bounds.union(circle.getBounds());
                }


                $timeout(function () {
                    google.maps.event.trigger(self.usersMap, 'resize');
                    $timeout(function () {
                        self.usersMap.fitBounds(bounds);
                    });
                });
            });
        }

    }

})();
