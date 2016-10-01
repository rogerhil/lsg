(function () {
    'use strict';

    angular
        .module('app.dashboard')
        .controller('DashboardController', DashboardController);

    DashboardController.$inject = ['$scope', '$timeout', 'UsersService', 'MatchesService'];
    function DashboardController($scope, $timeout, UsersService, MatchesService) {
        var self = this;
        self.latestFeedbacks = [];
        self.latestActivities = [];
        self.matchesLength = undefined;
        self.wishlistLength = undefined;
        self.matchesPercentage = 0;
        self.classyOptions = {
            speed: 5,
            fontSize: "30px",
            diameter: 70,
            lineColor: '#2196F3',
            remainingLineColor: "rgba(200,200,200,0.4)",
            lineWidth: 10,
            roundedLine: true
        };
        self.loader = $('#percMatches').ClassyLoader(self.classyOptions);
        self.loader.setPercent(self.matchesPercentage).draw();

        var updateLatestFeedbacks = function () {
            UsersService.latestFeedbacks().then(function (latestFeedbacks) {
                self.latestFeedbacks = latestFeedbacks;
            });
            $timeout(updateLatestFeedbacks, 30000);
        };
        var updateLatestActivities = function () {
            UsersService.latestActivities().then(function (latestActivities) {
                self.latestActivities = latestActivities;
            });
            $timeout(updateLatestActivities, 60000);
        };
        var reloadPerc = function () {
            if (self.matchesLength === undefined || self.wishlistLength === undefined) {
                return;
            }
            var perc = Math.ceil((self.matchesLength / self.wishlistLength) * 100);
            if (perc != self.matchesPercentage) {
                self.matchesPercentage = perc;
                self.loader.setPercent(self.matchesPercentage).draw();
            }
        };

        var updateMatchesPercentage = function () {
            MatchesService.getMatches().then(function (matches) {
                var filtered = matches.filter(function (o) {
                    return !o.ongoing;
                });
                self.matchesLength = filtered.length;
                reloadPerc();
            });
            UsersService.getWishlist().then(function (wishlist) {
                self.wishlistLength = wishlist.length || 1;
                reloadPerc();
            });
            $timeout(updateMatchesPercentage, 20000);
        };

        updateLatestFeedbacks();
        updateLatestActivities();
        updateMatchesPercentage();

    }
})();