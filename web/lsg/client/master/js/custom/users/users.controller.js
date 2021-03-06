
(function() {
    'use strict';

    angular
        .module('app.users', ['ngAnimate'])
        .controller('UsersCtrl', UsersCtrl)
        .controller('ChangePictureDialogCtrl', ChangePictureDialogCtrl)
        ;

    /*
      UsersCtrl
     */
    UsersCtrl.$inject = ['$scope', '$timeout', '$mdDialog', '$mdMedia', 'UsersService', '$state', '$stateParams', '$rootScope', 'GlobalFixes', 'Utils'];
    function UsersCtrl($scope, $timeout, $mdDialog, $mdMedia, UsersService, $state, $stateParams, $rootScope, GlobalFixes, Utils) {
        var self = this;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

        Tour.prototype._reposition = GlobalFixes._Tour_reposition;
        Tour.prototype._showPopover = GlobalFixes.hackTour_showPopover;

        self.isMobile = Utils.isMobile();
        self.tour = undefined;
        self.countryTour = undefined;
        self.gameTour = undefined;
        self.user = $rootScope.user;
        self.tourAlreadyDone = self.user.isProfileComplete();
        self.countries = ['IE', 'GB', 'IM'];
        self.errors = {};
        self.genderOptions = [{id: 'male', label: 'Male'},
                              {id: 'female', label: 'Female'}];
        self.mapMarkers = [];
        self.makeGameTour = !self.user.isProfileComplete();
        self.searchText = self.user.address.geocoder_address;
        self.saving = false;

        $('body').on('click', function (e) {
            if ($(e.target).hasClass('tour-backdrop')) {
                if (self.tour) self.tour.end();
                if (self.countryTour) self.countryTour.end();
                if (self.gameTour) self.gameTour.end();
                self.tour = undefined;
            }
        });
        $(document).on('keyup',function(evt) {
            if (evt.keyCode == 27) {
                if (self.tour) self.tour.end();
                if (self.countryTour) self.countryTour.end();
                if (self.gameTour) self.gameTour.end();
            }
        });

        self.isNarrowWidth = function () {
            return $(window).width() < 380;
        };

        self.queryAddress = function (query) {
            return UsersService.queryAddress(query);
        };

        self.changeCountry = function (open) {
            if (self.countryTour && !self.countryTour.ended()) {
                return;
            }
            if (open || $('#change-country-form').is(':hidden')) {
                $('#change-country-form').slideDown();
            } else {
                $('#change-country-form').slideUp();
            }
        };

        self.deleteMyAccount = function () {

            var confirm = $mdDialog.confirm()
                .title('Are you really sure you want to delete your account? \n All your data will be lost!')
                .textContent('')
                .ariaLabel('Delete my account')
                .ok("Yes")
                .cancel('No');
            $mdDialog.show(confirm).then(function () {
                UsersService.delete().then(function () {
                    window.location = '/logout/';
                }).catch(function (msg) {
                    var alert = $mdDialog.alert({
                        title: 'Failed to delete your account',
                        textContent: msg,
                        ok: 'Ok'
                    });
                    $mdDialog.show(alert);
                });
            }, function () {
                // TODO: maybe do something if cancel confirm
            });
        };

        function countryTourActivate() {

            if (self.countryTour && !$stateParams.chpic) {
                return;
            }
            GlobalFixes.fixZindex($scope);
            var msg;
            if (self.user.address.country.name) {
                msg = 'The country "' + self.user.address.country.name + '" coming from your social ' +
                      'account is not supported. Please select a valid country on the left.';
            } else {
                msg = 'Please select your country.';
            }
            var steps = [
                {
                    element: "#user-profile-change",
                    content: msg,
                    placement: $(window).width() < 992 ? 'bottom' : 'right'
                }
            ];
            GlobalFixes.closeAllTours();
            self.countryTour = new Tour({
                backdrop: true,
                backdropPadding: 0,
                keyboard: false,
                template: "" +
                    "<div class='popover tour'>" +
                    "  <div class='arrow'></div>" +
                    "  <h3 class='popover-title'></h3>" +
                    "  <div class='popover-content'></div>" +
                    "</div>",
                onEnd: function (tour) {
                    GlobalFixes.closeAllTours();
                    GlobalFixes.fixZindexOnEnd();
                },
                steps: steps});
            self.countryTour.init();
            self.countryTour.start();
            self.countryTour.restart(true);
            //section.css({'position': 'static'});
        }

        function tourMoveSteps() {
            if (self.tour && !self.tour.ended() && !$stateParams.chpic) {
                var currentStep = self.tour.getCurrentStep();
                var goStep = 0;
                if (self.user.hasBasicProfile()) {
                    goStep = 1;
                    if (self.user.hasAddress()) {
                        goStep = -1;
                    }
                }
                if (goStep == -1) {
                    self.tour.end();
                } else if (currentStep != goStep) {
                    self.tour.goTo(goStep);
                }
            }
        }

        function tourActivate() {
            if (self.user.isProfileComplete() || self.tourAlreadyDone || (self.tour && !self.tour.ended()) || $stateParams.chpic) {
               return;
            }

            GlobalFixes.fixZindex($scope);

            var steps = [
                {
                    element: "#profile-form",
                    title: "Complete the form",
                    content: "Please provide the missing information below.",
                    placement: 'top'
                },
                {
                    element: "#address-form",
                    title: "Address information",
                    content: "It is important to provide your address so you will be able fo find swappers near you.",
                    placement: 'top'
                }
            ];
            if (!self.tour) {
                GlobalFixes.closeAllTours();

                self.tour = new Tour({
                    backdrop: true,
                    backdropPadding: 20,
                    keyboard: false,
                    template: "" +
                        "<div class='popover tour'>" +
                        "  <div class='arrow'></div>" +
                        "  <h3 class='popover-title'></h3>" +
                        "  <div class='popover-content'></div>" +
                        "  <div class='popover-navigation'>" +
                        "    <button class='btn btn-default' data-role='prev'>?? Prev</button>" +
                        "    <button class='btn btn-default' data-role='next'>Next ??</button>" +
                        "    <button class='btn btn-default' data-role='end'>Got it!</button>" +
                        "  </div>" +
                        "</div>",
                    onShown: function (tour) {
                        var step = tour._options.steps[tour._current];
                        for (var k = 2; k < 7; k++) {
                            $timeout(function () {
                                document.querySelector(step.element + ' input.md-input').focus();
                            }, 100 * k);
                        }
                    },
                    onEnd: function (tour) {
                        GlobalFixes.closeAllTours();
                        GlobalFixes.fixZindexOnEnd();
                    },
                    steps: steps
                });
            }
            self.tour.init();
            self.tour.start();
            self.tour.restart(true);
            tourMoveSteps();

            if (self.user.first_name && self.user.last_name && self.user.email && self.user.phone1 && !self.user.gender) {
                $scope.profileForm.$setSubmitted();
            }
        }

        if (self.user.isCountrySupported()) {
            $timeout(function () {tourActivate()}, 1500);
        }

        if (!self.user.isCountrySupported()) {
            self.changeCountry();
            $timeout(function () {countryTourActivate()}, 1500);
        }

        function gameTourActivate() {
            // BootstrapTour is not compatible with z-index based layout
            // so adding position:static for this case makes the browser
            // to ignore the property
            if (self.gameTour || $state.current.name == 'app.games') {
                return;
            }

            GlobalFixes.fixZindex($scope);

            $rootScope.app.asideToggled = true;
            $rootScope.$apply();
            GlobalFixes.preFixTourLeftMenu($('li[sref="app.games"]'));
            //$rootScope.app.asideToggled = false;
            //$rootScope.$apply();
            GlobalFixes.closeAllTours();
            self.gameTour = new Tour({
                backdrop: true,
                keyboard: false,
                template: "" +
                    "<div class='popover tour'>" +
                    "  <div class='arrow'></div>" +
                    "  <h3 class='popover-title'></h3>" +
                    "  <div class='popover-content'></div>" +
                    "  <div class='popover-navigation'>" +
                    "    <button class='btn btn-default' data-role='end'>Close</button>" +
                    "  </div>" +
                    "</div>",
                onEnd: function (tour) {
                    GlobalFixes.closeAllTours();
                    GlobalFixes.fixZindexOnEnd();
                },
                steps: [
                {
                    element: 'li[sref="app.games"]',
                    title: "Add games",
                    content: "Specify which games you have and which games you want.",
                    placement: self.isNarrowWidth() ? 'bottom' : 'right',
                    backdropContainer: 'header.topnavbar-wrapper',
                    container: 'header.topnavbar-wrapper',
                    onShow: function (tour) {
                        //$rootScope.app.asideToggled = true;
                        GlobalFixes.fixTourLeftMenu(self.gameTour);
                        $timeout(function () {
                            $('nav.sidebar');
                        }, 100);
                    },
                    onHide: function (tour) {
                        $rootScope.app.asideToggled = false;
                        $rootScope.$apply();
                    }
                }
            ]});
            self.gameTour.init();
            self.gameTour.start();
            self.gameTour.restart(true);
        }

        self.changePicture = function () {
            if (self.tour && !self.tour.ended() || self.countryTour && !self.countryTour.ended()) {
                return;
            }
            $mdDialog.show({
                controllerAs: 'ctrl',
                controller: ChangePictureDialogCtrl,
                locals: {usersCtrl: self},
                templateUrl: $rootScope.viewPath('users/change-picture.partial.html'),
                parent: angular.element(document.body),
                clickOutsideToClose: true,
                fullscreen: useFullScreen
            });
        };

        if ($stateParams.chpic) {
            $timeout(function () {self.changePicture()}, 1000);
        }

        //$timeout(function () {gameTourActivate()}, 1000);
        //$timeout(function () {tourActivate()}, 1000);

        // $('.ng-scope').scrollTop(800);
        // $timeout(function () {
        //     $('.hidden-fix-tour-android').show();
        //     $('.hidden-fix-tour-android').focus();
        //     $('.hidden-fix-tour-android').hide();
        //     $timeout(function () {
        //         gameTourActivate();
        //     }, 2000);
        // }, 2000);

        self.updateUser = function (updateMap, settingsSection) {
            self.saving = true;
            if (settingsSection) {
                $('.profile-settings-loading').fadeIn();
            } else {
                $('.profile-loading').fadeIn();
            }
            $('input').blur();   // fix iOS header fixed position, force unfocus so the header expands again
            $('header').focus();  // fix iOS header fixed position, force unfocus so the header expands again
            UsersService.updateUser(self.user).then(function (user) {
                self.saving = false;
                $rootScope.user = user;
                self.user.address.geocoder_address = user.address.geocoder_address;
                self.user.address.latitude = user.address.latitude;
                self.user.address.longitude = user.address.longitude;
                $('.profile-loading').fadeOut();
                $('.profile-settings-loading').fadeOut();
                $('#change-country-form').slideUp();
                self.searchText = user.address.geocoder_address;
                self.errors = {};
                self.tourAlreadyDone = user.isProfileComplete();


                if (self.user.first_name && self.user.last_name && self.user.email && self.user.phone1 && !self.user.gender) {
                    $scope.profileForm.$setSubmitted();
                }

                if (self.countryTour) {
                    self.countryTour.end();
                    self.countryTour = undefined;
                }
                // if (!self.tour) {
                //     tourActivate();
                // }

                $timeout(function () {
                    tourMoveSteps();
                });

                if (!user.address.geocoder_address && user.address.country && !self.isMobile) {
                    setupMapInCountry(user.address.country.name);
                }

                tourActivate();

                if (self.tour && self.user.isProfileComplete()) {
                    self.tour.end();
                    self.tour = undefined;
                }
                if (updateMap && !self.isMobile) {
                    setupUserMap(user);
                }

                if (self.makeGameTour && self.user.isProfileComplete()) {
                    $('.hidden-fix-tour-android').show();
                    $('.hidden-fix-tour-android').focus();
                    $('.hidden-fix-tour-android').hide();
                    //$rootScope.app.asideToggled = true;
                    $timeout(function () {
                        gameTourActivate();
                    }, 1000);

                    var el = $('li[sref="app.games"] a');
                    el.attr('href', '#/app/games?tour=true');
                    el.click(function () {
                        $timeout(function () {
                            el.attr('href', '#/app/games');
                            el.unbind('click');
                        }, 1000);
                    });
                }
            }).catch(function (a) {
                $('.profile-loading').fadeOut();
                if (a.address && a.address.length) {
                    self.errors = {addressGlobal: a.address};
                } else {
                    self.errors = a;
                }
            });
        };

        function setupMapInCountry(country) {
            if (self.mapMarkers.length) {
                self.mapMarkers[0].setMap(null);
                self.mapMarkers = [];
            }
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode( {'address': country}, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    self.userMap.fitBounds(results[0].geometry.viewport);
                } else {
                    console.log("Geocode was not successful for the following reason: " + status);
                }
            });
        }

        function setupUserMap(user) {
            if (!user.address.latitude || !user.address.longitude) {
                if (user.address.country) {
                    setupMapInCountry(user.address.country.name);
                }
                return;
            }
            var userPosition = new google.maps.LatLng(user.address.latitude,
                                                      user.address.longitude);
            var userMarker;
            self.userMapOptions.center = userPosition;
            self.userMapOptions.zoom = 16;
            if (self.mapMarkers.length) {
                self.mapMarkers[0].setMap(null);
                self.mapMarkers = [];
            }
            $timeout(function () {
                self.userMap.setCenter(userPosition);
                self.userMap.setZoom(16);
                userMarker = new google.maps.Marker({map: self.userMap, position: userPosition, title: user.name, visible:true});
                self.mapMarkers.push(userMarker);
                var userInfoWindow = new google.maps.InfoWindow({
                    content: user.address.address1 || user.address.address2 || user.address.city || user.address.state
                });
                userInfoWindow.open(self.userMap, userMarker);
                $timeout(function () {
                    google.maps.event.trigger(self.userMap, 'resize');
                }, 100);
            });
        }
        self.userMapOptions = {
            zoom: 16,
            center: new google.maps.LatLng(1, 1),
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            scrollwheel: false
        };
        if (!self.isMobile) {
            setupUserMap(self.user);
        }
    }

    /*
      ChangePictureDialogCtrl
     */
    ChangePictureDialogCtrl.$inject = ['$scope', '$timeout', '$mdDialog', 'UsersService', '$rootScope', 'usersCtrl'];
    function ChangePictureDialogCtrl($scope, $timeout, $mdDialog, UsersService, $rootScope, usersCtrl) {
        var self = this;
        self.uploadedImage = '';
        self.croppedImage = '';

        function getBase64Image(url) {
            var extension = url.split('.').pop().split('?')[0];
            var img = new Image();
            //img.setAttribute('crossOrigin', 'anonymous');
            img.src = url;
            // Create an empty canvas element
            var canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            // Copy the image contents to the canvas
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            // Get the data-URL formatted image
            // Firefox supports PNG and JPEG. You could check img.src to
            // guess the original format, but be aware the using "image/jpg"
            // will re-encode the image.
            if (!extension) {
                extension = 'png';
            }
            var dataURL = canvas.toDataURL("image/" + extension);
            return dataURL;
        }
        self.uploadedImage = getBase64Image(usersCtrl.user.picture);

        var handleFileSelect = function(e) {
            var file = e.currentTarget.files[0];
            var reader = new FileReader();
            reader.onload = function (e) {
                $scope.$apply(function(){
                    self.uploadedImage = e.target.result;
                });
            };
            reader.readAsDataURL(file);
        };

        $timeout(function () {
            angular.element(document.querySelector('#fileInput')).on('change', handleFileSelect);
        }, 100);

        self.close = function (e) {
            e.preventDefault();
            $mdDialog.hide();
        };

        self.updateUserPicture = function (image) {
            UsersService.updateUserPicture(image).then(function (user) {
                usersCtrl.user = user;
                $rootScope.user = user;
                // $rootScope.$apply(function () {
                //     $rootScope.user = user;
                // });
                $mdDialog.hide();
            });
        };

    }


})();
