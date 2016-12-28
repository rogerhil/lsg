
(function() {
    'use strict';

    angular
        .module('app.browse', ['ngAnimate'])
        .controller('BrowseCtrl', BrowseCtrl)
        ;

    /*
      BrowseCtrl
     */
    BrowseCtrl.$inject = ['$scope', '$mdDialog', 'BrowseService'];
    function BrowseCtrl($scope, $mdDialog, BrowseService) {
        var self = this;
        self.games = [];
        self.loaded = false;
        self.defaultFilter = '-owned_count,name';
        self.selectedFilter = self.defaultFilter;
        self.currentPlatform = undefined;

        self.loadGamesList = function (filter) {
            if (!filter) {
                filter = self.defaultFilter;
            }
            self.selectedFilter = filter;
            BrowseService.getGames(filter, self.currentPlatform).then(function (games) {
                self.games = games;
                self.loaded = true;
            });
        };
        self.loadGamesList();

        self.selectPlatform = function () {
            //$rootScope.lastSelectedPlatform = self.currentPlatform;
            self.loadGamesList(self.selectedFilter);
        };

    }

})();
