(function () {
    'use strict';

    angular
        .module('app.requests', ['ngAnimate',])
        .controller('RequestsCtrl', RequestsCtrl)
        .controller('AcceptRequestDialogCtrl', AcceptRequestDialogCtrl)
        .controller('ContactDetailsCtrl', ContactDetailsCtrl)
        .controller('PendingRequestsWarningCtrl', PendingRequestsWarningCtrl)
        .controller('FinalizeRequestCtrl', FinalizeRequestCtrl)
    ;

    /*
     RequestsCtrl
     */
    RequestsCtrl.$inject = ['$scope', '$q', '$timeout', '$interval', '$mdDialog', '$mdMedia', 'RequestsService', '$rootScope', 'globalFunctions', '$stateParams', 'UsersService'];
    function RequestsCtrl($scope, $q, $timeout, $interval, $mdDialog, $mdMedia, RequestsService, $rootScope, globalFunctions, $stateParams, UsersService) {
        var self = this;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
        self.user = $rootScope.user;
        self.myRequests = [];
        self.myRequestsLoaded = false;
        self.incomingRequests = [];
        self.incomingRequestsLoaded = false;

        self.pendingMyRequests = [];
        self.pendingIncomingRequests = [];

        self.requestsPollingInterval = 10000;
        self.requestsPromise = undefined;
        self.tour = undefined;

        function checkToUpdateCountsStars(currentRequests, newRequests) {
            var reqsDict = {};
            for (var k = 0; k < currentRequests.length; k++) {
                var o = currentRequests[k];
                reqsDict[o.id] = o;
            }
            for (var k = 0; k < newRequests.length; k++) {
                var req = newRequests[k];
                if (req.isFinalized() && !reqsDict[req.id].isFinalized()) {
                    UsersService.updateUserCountsStarsDetails();
                }
            }
        }

        self.loadMyRequests = function () {
            RequestsService.getMyRequests().then(function (requests) {
                checkToUpdateCountsStars(self.myRequests, requests);
                self.myRequests = requests;
                self.myRequestsLoaded = true;
                $timeout(function () {
                    self.highlightRequest();
                }, 2500);
            });
        };

        self.loadIncomingRequests = function () {
            RequestsService.getIncomingRequests().then(function (requests) {
                checkToUpdateCountsStars(self.incomingRequests, requests);
                self.incomingRequests = requests;
                self.incomingRequestsLoaded = true;
                $timeout(function () {
                    self.highlightRequest();
                }, 2000);
            });
        };

        self.loadAllRequests = function () {
            if (!$('md-dialog').length) {
                self.loadMyRequests();
                self.loadIncomingRequests();
            }
        };

        self.pollRequests = function () {
            self.loadAllRequests();
            self.requestsPromise = $interval(self.loadAllRequests, self.requestsPollingInterval);
        };

        if (self.requestsPromise == undefined) {
            self.pollRequests();
        }

        $scope.$on('$destroy', function() {
            $interval.cancel(self.requestsPromise);
        });

        self.highlightRequest = function () {
            if (self.tour || $stateParams.id === undefined) {
                return;
            }
            //$timeout.cancel(self.requestsPromise);
            $interval.cancel(self.requestsPromise);
            self.requestsPromise = undefined;
            // BootstrapTour is not compatible with z-index based layout
            // so adding position:static for this case makes the browser
            // to ignore the property
            var section = angular.element('.wrapper > section');
            section.css({'position': 'static'});
            // finally restore on destroy and reuse the value declared in stylesheet
            $scope.$on('$destroy', function(){
                section.css({'position': ''});
            });
            var msg = $stateParams.msg || "Swap Request";
            self.tour = new Tour({
                backdrop: true,
                backdropPadding: 5,
                //duration: 5000,
                template: "" +
                    "<div class='popover tour'>" +
                    "  <div class='arrow'></div>" +
                    "  <div class='popover-content'></div>" +
                    "  <div class='popover-navigation'>" +
                    "    <a href='javascript:;' data-role='end'>OK!</a>" +
                    "  </div>" +
                    "</div>",
                onEnd: function (t) {
                    if (self.requestsPromise == undefined) {
                        self.pollRequests();
                    }
                },
                steps: [
                {
                    element: 'div.card[request-id="' + $stateParams.id + '"]',
                    content: msg,
                    placement: 'top'
                }
            ]});
            self.tour.init();
            self.tour.start();
            self.tour.restart(true);
            $('body').click(function () {
                self.tour.end();
            });
        };

        self.getPendingMyRequestsRelated = function (request, iwish, game) {
            var requests = self.pendingMyRequests.filter(function (item) {
                 return (item.status == $rootScope.Status.pending && item.id != request.id && (item.requested_game.id == iwish.id || item.requester_game.id == game.id));
            });
            return requests;
        };

        self.getPendingIncomingRequestsRelated = function (request, iwish, game) {
            var requests = self.incomingRequests.filter(function (item) {
                 return (item.status == $rootScope.Status.pending && item.id != request.id && (item.requester_game.id == iwish.id || item.requested_game.id == game.id));
            });
            return requests;
        };

        self.openAcceptRequestDialog = function(request) {
            $mdDialog.show({
                controllerAs: 'ctrl',
                controller: AcceptRequestDialogCtrl,
                locals: {request: request, requestsCtrl: self},
                templateUrl: 'app/views/requests/swap.partial.html',
                parent: angular.element(document.body),
                clickOutsideToClose: true,
                fullscreen: useFullScreen
            });
        };

        self.confirmCancelRequest = function(request) {
            var confirm = $mdDialog.confirm()
                .title('Are you sure you want to cancel this Swap Request?')
                .textContent('')
                .ariaLabel('Cancel Swap Request')
                .ok("Yes, I'm sure")
                .cancel('No');
            $mdDialog.show(confirm).then(function () {
                self.cancelRequest(request);
            }, function () {
                // TODO: maybe do something if cancel confirm
            });
        };

        self.cancelRequest = function (request) {
            RequestsService.cancelRequest(request.id).then(function (request) {
                var index = globalFunctions.getIndexByObjectAttribute(self.myRequests, 'id', request.id);
                self.myRequests.splice(index, 1, request);
            });
        };

        self.confirmRefuseRequest = function(request, fromOpenAcceptRequestDialog) {
            var confirm = $mdDialog.confirm()
                .title('Are you sure you want to refuse this Swap Request?')
                .textContent('')
                .ariaLabel('Refuse Swap Request')
                .ok("Yes, I'm sure")
                .cancel('No');
            $mdDialog.show(confirm).then(function () {
                self.refuseRequest(request);
            }, function () {
                if (fromOpenAcceptRequestDialog) {
                    self.openAcceptRequestDialog(request);
                }
            });
        };

        self.refuseRequest = function (request) {
            RequestsService.refuseRequest(request.id).then(function (request) {
                var index = globalFunctions.getIndexByObjectAttribute(self.incomingRequests, 'id', request.id);
                self.incomingRequests.splice(index, 1, request);
            });
        };

        self.showContactDetails = function (request, context, msg) {
            $mdDialog.show({
                controllerAs: 'ctrl',
                controller: ContactDetailsCtrl,
                locals: {request: request, context: context, msg: msg, requestsCtrl: self},
                templateUrl: 'app/views/requests/contact-details.partial.html',
                parent: angular.element(document.body),
                clickOutsideToClose: true,
                fullscreen: useFullScreen
            });
        };

        self.openFinalizeRequestDialog = function (request) {
            $mdDialog.show({
                controllerAs: 'ctrl',
                controller: FinalizeRequestCtrl,
                locals: {request: request, requestsCtrl: self},
                templateUrl: 'app/views/requests/finalize-request.partial.html',
                parent: angular.element(document.body),
                clickOutsideToClose: true,
                fullscreen: useFullScreen
            });
        };

        self.confirmArchiveRequest = function (request) {
            var confirm = $mdDialog.confirm()
                .title('Are you sure you want to archive this Swap Request?')
                .textContent('')
                .ariaLabel('Archive Swap Request')
                .ok("Yes, I'm sure")
                .cancel('No');
            $mdDialog.show(confirm).then(function () {
                self.archiveRequest(request);
            });
        };

        self.archiveRequest = function (request) {
            RequestsService.archiveRequest(request.id).then(function (request) {
                var index = globalFunctions.getIndexByObjectAttribute(self.incomingRequests, 'id', request.id);
                if (index != undefined) {
                    self.incomingRequests.splice(index, 1);
                } else {
                    index = globalFunctions.getIndexByObjectAttribute(self.myRequests, 'id', request.id);
                    self.myRequests.splice(index, 1);
                }
            });
        };
        self.confirmArchiveAllRequests = function () {
            var confirm = $mdDialog.confirm()
                .title('Are you sure you want to archive all finished requests?')
                .textContent('Finished requests are those in one of the following statuses: Succeeded, Failed, Refused, Cancelled, Failed or Expired.')
                .ariaLabel('Archive all finished requests!')
                .ok("Yes, I'm sure")
                .cancel('No');
            $mdDialog.show(confirm).then(function () {
                self.archiveAllRequests();
            });
        };
        self.archiveAllRequests = function () {
            RequestsService.archiveAllRequests().then(function (data) {
                var index;
                for (var k = 0; k < data.my.length; k++) {
                    index = globalFunctions.getIndexByObjectAttribute(self.myRequests, 'id', data.my[k]);
                    if (index === undefined) continue;
                    self.myRequests.splice(index, 1);
                }
                for (var k = 0; k < data.incoming.length; k++) {
                    index = globalFunctions.getIndexByObjectAttribute(self.incomingRequests, 'id', data.incoming[k]);
                    if (index === undefined) continue;
                    self.incomingRequests.splice(index, 1);
                }
            });
        };
        self.hasClosedRequests = function () {
            // OPTMIZE THIS!!!!! It's being called every time!
            for (var k = 0; k < self.myRequests.length; k++) {
                if (self.myRequests[k].isClosed()) return true;
            }
            for (var k = 0; k < self.incomingRequests.length; k++) {
                if (self.incomingRequests[k].isClosed()) return true;
            }
            return false;
        };
    }

    /*
     AcceptRequestDialogCtrl
     */
    AcceptRequestDialogCtrl.$inject = ['$scope', '$mdDialog', '$mdMedia', 'request', 'requestsCtrl', 'RequestsService', 'globalFunctions']
    function AcceptRequestDialogCtrl($scope, $mdDialog, $mdMedia, request, requestsCtrl, RequestsService, globalFunctions) {
        var self = this;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
        self.request = request;
        self.title = "Accept Swap Request";
        self.iwish = request.requester_game;
        self.game = request.requested_game;
        self.user = request.requester;
        self.swapUser = request.requester;
        self.requesterGameConditionNotes = request.requester_game_condition_notes;
        self.data = {
            requested_game_condition_notes: null  // IMPORTANT: now is the REQUESTED field!
        };
        self.errors = {};
        self.close = function (e) {
            e.preventDefault();
            $mdDialog.hide();
        }
        var accept = function (e) {
            e.preventDefault();
            var pendingMyRequests = requestsCtrl.getPendingMyRequestsRelated(request, request.requester_game, request.requested_game);
            var pendingIncomingRequests = requestsCtrl.getPendingIncomingRequestsRelated(request, request.requester_game, request.requested_game);
            if (pendingMyRequests.length || pendingIncomingRequests.length) {
                $mdDialog.show({
                    controllerAs: 'ctrl',
                    controller: PendingRequestsWarningCtrl,
                    locals: {request: request, pendingMyRequests: pendingMyRequests, pendingIncomingRequests: pendingIncomingRequests, acceptRequestDialogCtrl: self},
                    templateUrl: 'app/views/requests/warning-refuse-pending.partial.html',
                    parent: angular.element(document.body),
                    clickOutsideToClose: true,
                    fullscreen: useFullScreen
                });
            } else {
                self.acceptRequest();
            }
        };

        var refuse = function (e) {
            e.preventDefault();
            requestsCtrl.confirmRefuseRequest(request, true);
            self.close(e);
        };
        self.submit = accept;
        self.actionButtons = [
            {title: "Refuse", icon: "fa fa-thumbs-down", class: "btn-danger", action: refuse},
            {title: "Accept", icon: "fa fa-thumbs-up", class: "btn-success", action: accept}
        ];

        self.acceptRequest = function () {
            RequestsService.acceptRequest(self.request.id, self.data.requested_game_condition_notes).then(function (request) {
                var index = globalFunctions.getIndexByObjectAttribute(requestsCtrl.incomingRequests, 'id', request.id);
                requestsCtrl.incomingRequests.splice(index, 1, request);
                var msg = 'Congratulations! You have accepted to swap your game "' +
                    request.requested_game.full_name + '" with ' + request.requester.name + '\'s game "' +
                    request.requester_game.full_name + '". Contact ' + request.requester.name + ' so you can arrange ways of ' +
                    'concluding the swap.';
                requestsCtrl.showContactDetails(request, 'incomingRequests', msg);
            });
        };

    }

    /*
     ContactDetailsCtrl
     */
    ContactDetailsCtrl.$inject = ['$scope', '$timeout', '$mdDialog', 'request', 'context', 'msg', 'requestsCtrl', 'UsersService']
    function ContactDetailsCtrl($scope, $timeout, $mdDialog, request, context, msg, requestsCtrl, UsersService) {
        var self = this;
        self.msg = msg;
        self.user = requestsCtrl.user;
        self.swapUser = context == 'incomingRequests' ? request.requester : request.requested;
        self.request = request;
        self.context = context;
        self.latestFeedbacks = [];

        UsersService.latestFeedbacks(self.swapUser).then(function (latestFeedbacks) {
            self.latestFeedbacks = latestFeedbacks;
        });

        self.toggleFeedbacks = function () {
            if ($('#feedbacks').is(':hidden')) {
                $('#feedbacks').slideDown();
            } else {
                $('#feedbacks').slideUp();
            }
        };

        self.close = function () {
            $mdDialog.hide();
        };

        function setupContactDetailsMap(user, otherUser) {
            var bounds = new google.maps.LatLngBounds();
            var userPosition = new google.maps.LatLng(user.address.latitude,
                                                      user.address.longitude);
            var otherUserPosition = new google.maps.LatLng(otherUser.address.latitude,
                                                           otherUser.address.longitude);
            var userMarker, otherUserMarker;

            $timeout(function () {
                userMarker = new google.maps.Marker({map: self.contactDetailsMap, position: userPosition, title: user.name, visible:true});
                otherUserMarker = new google.maps.Marker({map: self.contactDetailsMap, position: otherUserPosition, title: otherUser.name, visible:true});
                bounds.extend(userMarker.position);
                bounds.extend(otherUserMarker.position);
                var userInfoWindow = new google.maps.InfoWindow({
                    content: 'My location'
                });
                var otherUserInfoWindow = new google.maps.InfoWindow({
                    content: otherUser.name + " location"
                });
                userInfoWindow.open(self.contactDetailsMap, userMarker);
                otherUserInfoWindow.open(self.contactDetailsMap, otherUserMarker);
                $timeout(function () {
                    google.maps.event.trigger(self.contactDetailsMap, 'resize');
                    $timeout(function () {
                        self.contactDetailsMap.fitBounds(bounds);
                    });
                });
            });

            self.contactDetailsMapOptions = {
                zoom: 14,
                center: userPosition,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                scrollwheel: false
            };
        }

        setupContactDetailsMap(self.user, self.swapUser);
    }

    /*
     PendingRequestsWarningCtrl
     */
    PendingRequestsWarningCtrl.$inject = ['$scope', '$mdDialog', 'request', 'pendingMyRequests', 'pendingIncomingRequests', 'acceptRequestDialogCtrl']
    function PendingRequestsWarningCtrl($scope, $mdDialog, request, pendingMyRequests, pendingIncomingRequests, acceptRequestDialogCtrl) {
        var self = this;
        self.pendingMyRequests = pendingMyRequests;
        self.pendingIncomingRequests = pendingIncomingRequests;
        self.iwish = request.requester_game;
        self.game = request.requested_game;
        self.iwish.swap_pending = true;
        self.game.swap_pending = true;
        self.totalPendingRequests = function () {
            return self.pendingMyRequests.length + self.pendingIncomingRequests.length;
        };
        self.no = function () {
            $mdDialog.hide();
        };
        self.yes = function () {
            acceptRequestDialogCtrl.acceptRequest();
        };
    }

    /*
     FinalizeRequestCtrl
     */
    FinalizeRequestCtrl.$inject = ['$scope', '$mdDialog', 'request', 'requestsCtrl', 'RequestsService', 'globalFunctions', 'UsersService']
    function FinalizeRequestCtrl($scope, $mdDialog, request, requestsCtrl, RequestsService, globalFunctions, UsersService) {
        var self = this;
        self.request = request;
        self.user = requestsCtrl.user;
        self.data = {};
        if (self.user.id == request.requester.id) {
            self.iwish = request.requested_game;
            self.game = request.requester_game;
            self.swapUser = request.requested;
        } else {
            self.iwish = request.requester_game;
            self.game = request.requested_game;
            self.swapUser = request.requester;
        }

        self.close = function (e) {
            e.preventDefault();
            $mdDialog.hide();
        };
        self.finalizeRequest = function (e) {
            e.preventDefault();
            RequestsService.finalizeRequest(self.request.id, self.data.swapped, self.data.other_feedback, self.data.other_feedback_notes).then(function (request) {
                $mdDialog.hide();
                var indexInc = globalFunctions.getIndexByObjectAttribute(requestsCtrl.incomingRequests, 'id', request.id);
                var indexMy = globalFunctions.getIndexByObjectAttribute(requestsCtrl.myRequests, 'id', request.id);
                if (indexInc !== undefined) {
                    requestsCtrl.incomingRequests.splice(indexInc, 1, request);
                }
                if (indexMy !== undefined) {
                    requestsCtrl.myRequests.splice(indexMy, 1, request);
                }
                // to update stars :)
                UsersService.updateUserCountsStarsDetails();
            });
        };
    }

})();
