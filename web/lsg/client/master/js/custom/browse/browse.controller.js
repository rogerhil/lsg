
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

        self.wantedTitle = function (game) {
            var c = game.wanted_count;
            switch (c) {
                case 0:
                    return 'Nobody wants this game';
                case 1:
                    if (self.iWant(game)) {
                        return 'You want this game';
                    } else {
                        return '1 person wants this game';
                    }
                default:
                    var title = c + ' people want this game';
                    if (self.iWant(game)) {
                        title += ' (including you)';
                    }
                    return title;
            }
        };

        self.ownedTitle = function (game) {
            var c = game.owned_count;
            switch (c) {
                case 0:
                    return 'Nobody has this game';
                case 1:
                    if (self.iHave(game)) {
                        return 'You have this game';
                    } else {
                        return '1 person has this game';
                    }
                default:
                    var title = c + ' people have this game';
                    if (self.iHave(game)) {
                        title += ' (including you)'
                    }
                    return title;
            }
        };

        self.inMatches = function (game) {
            if (!game.inMatches) {
                if (game.iWant) {
                    game.inMatches = $rootScope.matchesWantedIds.indexOf(game.id) != -1;
                } else {
                    game.inMatches = $rootScope.matchesOwnedIds.indexOf(game.id) != -1;
                }
            }
            return game.inMatches;
        };

        self.inOpenRequest = function (game) {
            if (!game.inOpenRequest) {
                game.inOpenRequest = $rootScope.myOpenRequestsGamesIds.indexOf(game.id) != -1 ||
                                     $rootScope.incomingOpenRequestsGamesIds.indexOf(game.id) != -1;
            }
            return game.inOpenRequest;
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
                templateUrl: $rootScope.viewPath('browse/game-details.html'),
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
        self.markers = [];
        var myMarker;
        var userInfoWindow;

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
            resetMap();
            $mdDialog.hide();
        };

        self.checkoutMatches = function () {
            self.close();
            $timeout(function () {
                $state.transitionTo("app.matches");
            }, 600);
        };

        self.openRequests = function () {
            self.close();
            $timeout(function () {
                $state.transitionTo("app.requests");
            }, 600);
        };

        self.wantedTitle = browseCtrl.wantedTitle;
        self.ownedTitle = browseCtrl.ownedTitle;

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
            for (var i = 0; i < self.markers.length; i++) {
                self.markers[i].setMap(null);
            }
            self.markers = [];
        }

        function randomLocationNearBy(lat, lng) {
            var r = 5000/111300;  // 5 km
            var u = Math.random();
            var v = Math.random();
            var w = r * Math.sqrt(u);
            var t = 2 * Math.PI * v;
            var x = w * Math.cos(t) ;
            var y1 = w * Math.sin(t);
            var x1 = x / Math.cos(lat);
            var newLat = lat + y1;
            var newLng = lng + x1;
            return [newLat, newLng];
        }

        function randomMapLatLngNearByUser(user) {
            var coords = randomLocationNearBy(user.address.city_latitude, user.address.city_longitude);
            return new google.maps.LatLng(coords[0], coords[1]);
        }

        var myPosition = new google.maps.LatLng($rootScope.user.address.latitude,
                                                $rootScope.user.address.longitude);

        function setupUsersMap() {
            var bounds = new google.maps.LatLngBounds();
            var radius = [14, 18, 15, 17, 16];  // km

            self.usersMapOptions = {
                zoom: 14,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                scrollwheel: false
            };
            myMarker = new google.maps.Marker({
                map: self.usersMap,
                position: myPosition,
                title: 'My location',
                visible: true
            });

            userInfoWindow = new google.maps.InfoWindow({
                content: 'Your location'
            });
            userInfoWindow.open(self.usersMap, myMarker);

            bounds.extend(myMarker.position);

            $timeout(function () {
                for (var k = 0; k < self.ownedBy.length; k++) {
                    var user = self.ownedBy[k];
                    var userPosition = randomMapLatLngNearByUser(user);
                    if (user.id == $rootScope.user.id) {
                        continue;
                    }
                    var marker = new google.maps.Marker({
                        map: self.usersMap,
                        position: userPosition,
                        visible: true,
                        title: user.name,
                        icon: '/app/app/img/star.png'
                    });

                    self.markers.push(marker);
                    bounds.extend(marker.position);
                }

                for (var k = 0; k < self.wantedBy.length; k++) {
                    var user = self.wantedBy[k];
                    var userPosition = randomMapLatLngNearByUser(user);
                    if (user.id == $rootScope.user.id) {
                        continue;
                    }
                    var marker = new google.maps.Marker({
                        map: self.usersMap,
                        position: userPosition,
                        visible: true,
                        title: user.name,
                        icon: '/app/app/img/heart.png'
                    });
                    self.markers.push(marker);
                    bounds.extend(marker.position);
                }

                $timeout(function () {
                    google.maps.event.trigger(self.usersMap, 'resize');
                    $('.gm-style-iw div').css('max-height', '15px');  // FIX infoWindow bug when it open again
                    $timeout(function () {
                        self.usersMap.fitBounds(bounds);
                    });
                });
            });
        }

    }

})();
