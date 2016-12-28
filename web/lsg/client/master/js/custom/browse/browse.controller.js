
(function() {
    'use strict';

    angular
        .module('app.browse', ['ngAnimate'])
        .controller('BrowseCtrl', BrowseCtrl)
        ;

    /*
      BrowseCtrl
     */
    BrowseCtrl.$inject = ['$scope', '$mdDialog', '$timeout', '$rootScope', 'BrowseService'];
    function BrowseCtrl($scope, $mdDialog, $timeout, $rootScope, BrowseService) {
        var self = this;
        self.games = [];
        self.defaultFilter = '-owned_count,name,id';  // the id is very important to avoid repeated items in pages.
        self.selectedFilter = self.defaultFilter;
        self.currentPlatform = $rootScope.browseLastSelectedPlatform;
        self.page = 1;
        self.endOfList = false;
        self.loading = false;
        self.paginating = false;

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

    }

})();
