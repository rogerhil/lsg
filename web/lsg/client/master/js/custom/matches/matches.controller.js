
(function() {
    'use strict';

    angular
        .module('app.matches', ['ngAnimate'])
        .controller('MatchesCtrl', MatchesCtrl)
        .controller('MatchDialogCtrl', MatchDialogCtrl)
        .controller('RequestSwapDialogCtrl', RequestSwapDialogCtrl)
        .controller('PendingRequestWarningCtrl', PendingRequestWarningCtrl)
        ;

    /*
      MatchesCtrl
     */
    MatchesCtrl.$inject = ['$scope', '$q', '$timeout', '$mdDialog', '$mdMedia', '$rootScope', 'MatchesService'];
    function MatchesCtrl($scope, $q, $timeout, $mdDialog, $mdMedia, $rootScope, MatchesService) {
        var self = this;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
        self.matches = [];
        self.filteredMatches = [];
        self.loaded = false;
        self.showOngoingSwaps = false;
        self.showPendingSwaps = true;
        self.showSimilarMatches = true;

        self.filterMatches = function (matches) {
            self.loaded = true;
            if (matches) {
                self.matches = matches;
            }
            self.filteredMatches = self.matches.filter(function (match) {
                if ((self.showOngoingSwaps || (!match.no_games_left && !match.ongoing)) &&
                    (self.showPendingSwaps || !match.iwish.swap_pending) &&
                    (self.showSimilarMatches || !match.iwish.is_similar)) {
                    return match;
                }
            });
        };

        if ($rootScope.matchesPromise) {
            $timeout.cancel($rootScope.matchesPromise);
        }
        MatchesService.pollMatches(self.filterMatches);

        self.openMatch = function(match) {
            $mdDialog.show({
                controllerAs: 'ctrl',
                controller: 'MatchDialogCtrl',
                locals: {match: match, matchesCtrl: self},
                templateUrl: $rootScope.viewPath('matches/match.partial.html'),
                parent: angular.element(document.body),
                clickOutsideToClose: true,
                fullscreen: useFullScreen
            });
        };

        $scope.$on('$destroy', function() {
            // restart poll without callback
            $timeout.cancel($rootScope.matchesPromise);
            $timeout(function () {
                MatchesService.pollMatches();
            }, $rootScope.matchesPollingInterval);
        });
    }

    /*
     MatchDialogCtrl
     */
    MatchDialogCtrl.$inject = ['$scope', '$mdDialog', 'match', '$mdMedia', 'matchesCtrl', '$rootScope'];
    function MatchDialogCtrl($scope, $mdDialog, match, $mdMedia, matchesCtrl, $rootScope) {
        var self = this;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
        self.match = match;
        self.close = function () {
            $mdDialog.hide();
        };

        self.openMatchCallback = function() {
            matchesCtrl.openMatch(match);
        };

        self.requestSwap = function(match, game, swapUser) {
            $mdDialog.show({
                controllerAs: 'ctrl',
                controller: 'RequestSwapDialogCtrl',
                locals: {match: match, game: game, swapUser: swapUser, matchesCtrl: matchesCtrl, matchCtrl: self},
                templateUrl: $rootScope.viewPath('requests/swap.partial.html'),
                parent: angular.element(document.body),
                clickOutsideToClose: true,
                fullscreen: useFullScreen
            });
        };
    }

    /*
     RequestSwapDialogCtrl
     */
    RequestSwapDialogCtrl.$inject = ['$scope', '$mdDialog', '$mdMedia', 'match', 'game', 'swapUser', 'RequestsService', 'UsersService', 'matchesCtrl', 'matchCtrl', '$rootScope', 'Notify']
    function RequestSwapDialogCtrl($scope, $mdDialog, $mdMedia, match, game, swapUser, RequestsService, UsersService, matchesCtrl, matchCtrl, $rootScope, Notify) {
        var self = this;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
        self.title = "Request Swap";
        self.iwish = match.iwish;
        self.game = game;
        self.authenticatedUser = $rootScope.user;
        self.swapUser = swapUser;
        self.recentFeedback = [];
        self.loadedRecentFeedback = false;
        self.isRequester = true;
        self.data = {
            requester_game_condition_notes: null  // IMPORTANT: now is the REQUESTER field!
        };
        self.errors = {};
        self.close = function (e) {
            e.preventDefault();
            $mdDialog.hide();
            matchesCtrl.openMatch(match);
        };

        var submitRequestSwap = function (e) {
            e.preventDefault();
            //if (!self.data.requester_game_condition_notes.length && ) {
            //
            //}
            if (self.iwish.swap_pending || self.game.swap_pending) {
                self.warnUserAboutPendingRequest();
            } else {
                self.createSwapRequest()
            }
        };

        UsersService.recentFeedback(swapUser).then(function (recentFeedback) {
            self.recentFeedback = recentFeedback;
            self.loadedRecentFeedback = true;
        });

        self.toggleFeedback = function () {
            $scope.feedbackShowHide = !$scope.feedbackShowHide;
            if ($scope.feedbackShowHide) {
                $('#feedback').slideDown();
            } else {
                $('#feedback').slideUp();
            }
        };

        self.openRequestSwappCallback = function() {
            matchCtrl.requestSwap(match, game, swapUser);
        };

        self.warnUserAboutPendingRequest = function () {
            $mdDialog.show({
                controllerAs: 'ctrl',
                controller: 'PendingRequestWarningCtrl',
                locals: {match: match, game: game, swapUser: swapUser, matchesCtrl: matchesCtrl, requestSwapDialogCtrl: self},
                templateUrl: $rootScope.viewPath('matches/match.warning.html'),
                parent: angular.element(document.body),
                clickOutsideToClose: true,
                fullscreen: useFullScreen
            });
        };

        self.createSwapRequest = function () {
            if (!self.data.requester_game_condition_notes) {
                $('#requester_game_condition_notes').focus();
                return;
            }
            RequestsService.createSwapRequest(self.swapUser.id,
                self.iwish.id, self.authenticatedUser.id, self.game.id,
                self.data.requester_game_condition_notes,
                self.swapUser.address.distance).then(function (request) {
                    $mdDialog.hide();
                    window.location = "#/app/requests?id=" + request.id + '&msg=Your request is pending until ' + self.swapUser.name + ' accepts it.&my=1';
                    Notify.alert("Your request has been successfully created.", {status: 'success'});
                }).catch(function (a) {
                    console.log(a);
                    self.errors = a;
                });
        };

        self.submit = submitRequestSwap;
        self.actionButtons = [
            {title: "Request Swap", icon: "fa fa-hand-o-up", class: "btn-primary", action: submitRequestSwap}
        ];
    }

    /*
     PendingRequestWarningCtrl
     */
    PendingRequestWarningCtrl.$inject = ['$scope', '$mdDialog', 'match', 'game', 'swapUser', 'RequestsService', 'matchesCtrl', 'requestSwapDialogCtrl', '$rootScope']
    function PendingRequestWarningCtrl($scope, $mdDialog, match, game, swapUser, RequestsService, matchesCtrl, requestSwapDialogCtrl, $rootScope) {
        var self = this;
        self.title = "Request Swap";
        self.iwish = match.iwish;
        self.game = game;
        self.authenticatedUser = $rootScope.user;
        self.swapUser = swapUser;
        self.message = '';
        self.pendingMyRequests = [];
        self.pendingIncomingRequests = [];

        RequestsService.getMyRequests().then(function (requests) {
            self.pendingMyRequests = requests.filter(function (request) {
                 return ((request.requested_game.id == self.iwish.id || request.requester_game.id == self.game.id) && request.isPending());
            });
        });
        RequestsService.getIncomingRequests().then(function (requests) {
            self.pendingIncomingRequests = requests.filter(function (request) {
                 return ((request.requester_game.id == self.iwish.id || request.requested_game.id == self.game.id) && request.isPending());
            });
        });

        self.totalPendingRequests = function () {
            return self.pendingMyRequests.length + self.pendingIncomingRequests.length;
        };

        self.no = function () {
            matchesCtrl.openMatch(match);
        };
        self.yes = function () {
            requestSwapDialogCtrl.createSwapRequest();
        };
    }

})();
