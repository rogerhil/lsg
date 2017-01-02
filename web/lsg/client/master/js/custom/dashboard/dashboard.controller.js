(function () {
    'use strict';

    angular
        .module('app.dashboard')
        .controller('DashboardController', DashboardController);

    DashboardController.$inject = ['$scope', '$timeout', 'UsersService', 'MatchesService'];
    function DashboardController($scope, $timeout, UsersService, MatchesService) {
        var self = this;
        self.recentFeedback = [];
        self.recentFeedbackLoaded = false;
        self.recentActivities = [];
        self.recentActivitiesLoaded = false;
        self.matchesLength = undefined;
        self.wishlistLength = undefined;
        self.matchesPercentage = 0;
        self.updateRecentFeedbackPromise = undefined;
        self.updateRecentActivitiesPromise = undefined;
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
        $timeout(function () {
            self.loader.setPercent(self.matchesPercentage).draw();
        }, 10);

        $scope.$on('$destroy', function() {
            $timeout.cancel(self.updateRecentFeedbackPromise);
            $timeout.cancel(self.updateRecentActivitiesPromise);
            $timeout.cancel($rootScope.matchesPromise);
            $timeout(function () {
                MatchesService.pollMatches();
            }, $rootScope.matchesPollingInterval);
        });

        var updateRecentFeedback = function () {
            UsersService.recentFeedback().then(function (recentFeedback) {
                self.recentFeedback = recentFeedback;
                self.recentFeedbackLoaded = true;
            });
            self.updateRecentFeedbackPromise = $timeout(updateRecentFeedback, 30000);
        };
        var updateRecentActivities = function () {
            UsersService.recentActivities().then(function (recentActivities) {
                self.recentActivities = recentActivities;
                self.recentActivitiesLoaded = true;
            });
            self.updateRecentActivitiesPromise = $timeout(updateRecentActivities, 60000);
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

        var updateMatchesPercentage = function (matches) {
            var filtered = matches.filter(function (o) {
                return !o.ongoing && !o.iwish.is_similar && !o.no_games_left;
            });
            self.matchesLength = filtered.length;
            reloadPerc();
            UsersService.getWishlist().then(function (wishlist) {
                var length = wishlist.reduce(function (a, b) {
                    return a + b.items.length;
                }, 0);
                self.wishlistLength = length || 1;
                reloadPerc();
            });
        };

        updateRecentFeedback();
        updateRecentActivities();

        if ($rootScope.matchesPromise) {
            $timeout.cancel($rootScope.matchesPromise);
        }
        MatchesService.pollMatches(updateMatchesPercentage);

    }
})();