
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
    UsersCtrl.$inject = ['$scope', '$timeout', '$mdDialog', '$mdMedia', 'UsersService', 'GamesService', 'Notify', '$rootScope', 'GlobalFixes'];
    function UsersCtrl($scope, $timeout, $mdDialog, $mdMedia, UsersService, GamesService, Notify, $rootScope, GlobalFixes) {
        var self = this;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

        Tour.prototype._reposition = GlobalFixes._Tour_reposition;

        self.tour = undefined;
        self.countryTour = undefined;
        self.gameTour = undefined;
        self.user = $rootScope.user;
        self.allPlatforms = [];
        self.countries = ['IE', 'GB', 'IM'];
        self.errors = {};
        self.genderOptions = [{id: 'male', label: 'Male'},
                              {id: 'female', label: 'Female'}];
        self.mapMarkers = [];
        self.makeGameTour = !self.user.address.latitude || !self.user.address.longitude || !self.user.platforms.length;
        self.searchText = self.user.address.geocoder_address;

        $('body').on('click', function (e) {
            if ($(e.target).hasClass('tour-backdrop')) {
                if (self.tour) self.tour.end();
                if (self.countryTour) self.countryTour.end();
                if (self.gameTour) self.gameTour.end();
            }
        });
        $(document).on('keyup',function(evt) {
            if (evt.keyCode == 27) {
                if (self.tour) self.tour.end();
                if (self.countryTour) self.countryTour.end();
                if (self.gameTour) self.gameTour.end();
            }
        });

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

        function countryTourActivate() {

            if (self.countryTour) {
                return;
            }

            // BootstrapTour is not compatible with z-index based layout
            // so adding position:static for this case makes the browser
            // to ignore the property
            var section = angular.element('.wrapper > section');
            section.css({'position': 'static'});
            // finally restore on destroy and reuse the value declared in stylesheet
            $scope.$on('$destroy', function(){
                section.css({'position': ''});
            });
            var msg;
            if (self.user.address.country.name) {
                msg = 'The country "' + self.user.address.country.name + '" coming from your social ' +
                      'account is not supported. Please select a valid country on the left.';
            } else {
                msg = 'Please select your country on the left.';
            }
            var steps = [
                {
                    element: "#user-profile-change",
                    content: msg,
                    placement: 'right'
                }
            ];
            self.countryTour = new Tour({
                backdrop: true,
                backdropPadding: 0,
                template: "" +
                    "<div class='popover tour'>" +
                    "  <div class='arrow'></div>" +
                    "  <h3 class='popover-title'></h3>" +
                    "  <div class='popover-content'></div>" +
                    "</div>",
                steps: steps});
            self.countryTour.init();
            self.countryTour.start();
            self.countryTour.restart(true);
        }

        function tourMoveSteps() {
            if (self.tour && !self.tour.ended()) {
                var currentStep = self.tour.getCurrentStep();
                var goStep = 0;
                if (self.user.hasBasicProfile()) {
                    goStep = 1;
                    if (self.user.havePlatforms()) {
                        goStep = 2;
                        if (self.user.hasAddress()) {
                            goStep = -1;
                        }
                    }
                }
                if (goStep == -1) {
                    self.tour.end();
                } else if (currentStep < goStep) {
                    self.tour.goTo(goStep);
                }
            }
        }

        function tourActivate() {
            if (self.user.isProfileComplete()) {
                return;
            }

            // BootstrapTour is not compatible with z-index based layout
            // so adding position:static for this case makes the browser
            // to ignore the property
            var section = angular.element('.wrapper > section');
            section.css({'position': 'static'});
            // finally restore on destroy and reuse the value declared in stylesheet
            $scope.$on('$destroy', function(){
                section.css({'position': ''});
            });
            var steps = [
                {
                    element: "#profile-form",
                    title: "Complete the form",
                    content: "Please provide missing information below.",
                    placement: 'top'
                },
                {
                    element: "#platforms-field",
                    title: "Platforms",
                    content: "Please don't forget to specify your own game consoles.",
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
                self.tour = new Tour({
                    backdrop: true,
                    backdropPadding: 20,
                    template: "" +
                        "<div class='popover tour'>" +
                        "  <div class='arrow'></div>" +
                        "  <h3 class='popover-title'></h3>" +
                        "  <div class='popover-content'></div>" +
                        "  <div class='popover-navigation'>" +
                        "    <button class='btn btn-default' data-role='prev'>« Prev</button>" +
                        "    <button class='btn btn-default' data-role='next'>Next »</button>" +
                        "    <button class='btn btn-default' data-role='end'>Got it!</button>" +
                        "  </div>" +
                        "</div>",
                    steps: steps});
            }
            self.tour.init();
            self.tour.start();
            self.tour.restart(true);
            tourMoveSteps();
        }

        if (self.user.isCountrySupported()) {
            $timeout(function () {tourActivate()}, 1000);
        }

        if (!self.user.isCountrySupported()) {
            self.changeCountry();
            $timeout(function () {countryTourActivate()}, 1000);
        }

        function gameTourActivate() {
            // BootstrapTour is not compatible with z-index based layout
            // so adding position:static for this case makes the browser
            // to ignore the property
            if (self.gameTour) {
                return;
            }
            var section = angular.element('.wrapper > section');
            section.css({'position': 'static'});
            // finally restore on destroy and reuse the value declared in stylesheet
            $scope.$on('$destroy', function(){
                section.css({'position': ''});
            });
            self.gameTour = new Tour({
                backdrop: true,
                backdropContainer: 'header.topnavbar-wrapper',
                container: 'header.topnavbar-wrapper',
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
                    $('.popover.tour').remove();
                },
                steps: [
                {
                    element: 'li[sref="app.games"]',
                    title: "Add games",
                    content: "You need to specify which games you have and specify which games you wish by clicking in the menu on the left.",
                    placement: 'right',
                    onShow: function (tour) {
                        $rootScope.app.asideToggled = true;
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
            $mdDialog.show({
                controllerAs: 'ctrl',
                controller: ChangePictureDialogCtrl,
                locals: {usersCtrl: self},
                templateUrl: 'app/views/users/change-picture.partial.html',
                parent: angular.element(document.body),
                clickOutsideToClose: true,
                fullscreen: useFullScreen
            });
        };


        //$timeout(function () {gameTourActivate()}, 1000);

        GamesService.getPlatforms().then(function (platforms) {
            self.allPlatforms = platforms;
        });

        self.updateUser = function (updateMap) {
            $('.profile-loading').fadeIn();
            UsersService.updateUser(self.user).then(function (user) {
                //Notify.alert("Your profile data has been successfully saved.", {status: 'success'});
                $('.profile-loading').fadeOut();
                $('#change-country-form').slideUp();
                self.searchText = user.address.geocoder_address;
                self.errors = {};
                self.user = user;
                $rootScope.user = user;

                if (self.countryTour) {
                    self.countryTour.end();
                    self.countryTour = null;
                }
                // if (!self.tour) {
                //     tourActivate();
                // }

                $timeout(function () {
                    tourMoveSteps();
                });

                if (!user.address.geocoder_address && user.address.country) {
                    setupMapInCountry(user.address.country.name);
                }

                tourActivate();

                $($('input, md-select')[$('input, md-select').index($(':focus')) + 1]).focus();

                if (updateMap) {
                    setupUserMap(user);
                }
                if (self.tour && self.user.isProfileComplete()) {
                    self.tour.end();
                }
                if (self.makeGameTour && self.user.isProfileComplete()) {
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
                    //self.userMap.fitBounds(results[0].geometry.viewport);
                } else {
                    console.log("Geocode was not successful for the following reason: " + status);
                }
            });
        }

        function setupUserMap(user) {
            if (!user.address.latitude || !user.address.longitude) {
                if (self.user.address.country) {
                    setupMapInCountry(self.user.address.country.name);
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
        setupUserMap(self.user);
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
