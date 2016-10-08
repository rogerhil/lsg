
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
    UsersCtrl.$inject = ['$scope', '$timeout', '$mdDialog', '$mdMedia', 'UsersService', 'GamesService', 'Notify', '$rootScope'];
    function UsersCtrl($scope, $timeout, $mdDialog, $mdMedia, UsersService, GamesService, Notify, $rootScope) {
        var self = this;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
        self.tour = undefined;
        self.countryTour = undefined;
        self.user = $rootScope.user;
        self.allPlatforms = [];
        self.countries = ['Ireland', 'United Kingdom', 'Isle of Man'];
        self.errors = {};
        self.genderOptions = [{id: 'male', label: 'Male'},
                              {id: 'female', label: 'Female'}];
        self.mapMarkers = [];
        self.makeGameTour = !self.user.address.latitude || !self.user.address.longitude || !self.user.platforms.length;
        self.searchText = self.user.address.geocoder_address;

        var tourSteps = [];
        if (!self.user.hasBasicProfile()) {
            tourSteps.push(0);
        }
        if (!self.user.havePlatforms()) {
            tourSteps.push(1);
        }
        if (!self.user.hasAddress()) {
            tourSteps.push(2);
        }

        self.queryAddress = function (query) {
            return UsersService.queryAddress(query);
        };

        self.changeCountry = function () {
            $('#change-country-form').slideDown();
        };

        function countryTourActivate() {
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
                    element: "#user-profile-change",
                    content: 'The country "' + self.user.address.country + '" information coming from your social ' +
                             'account is not supported. Please select a valid country.',
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
                    "  <div class='popover-navigation'>" +
                    "    <button class='btn btn-default' data-role='end'>Got it!</button>" +
                    "  </div>" +
                    "</div>",
                steps: steps});
            self.countryTour.init();
            self.countryTour.start();
            self.countryTour.restart(true);
        }

        function tourActivate(onlySteps) {
            // BootstrapTour is not compatible with z-index based layout
            // so adding position:static for this case makes the browser
            // to ignore the property
            var section = angular.element('.wrapper > section');
            section.css({'position': 'static'});
            // finally restore on destroy and reuse the value declared in stylesheet
            $scope.$on('$destroy', function(){
                section.css({'position': ''});
            });
            var baseSteps = [
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
            var steps = [];
            if (onlySteps) {
                for (var k = 0; k < onlySteps.length; k++) {
                    steps.push(baseSteps[onlySteps[k]]);
                }
            } else {
                steps = baseSteps;
            }
            self.tour = new Tour({
                backdrop: true,
                backdropPadding: 10,
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
            self.tour.init();
            self.tour.start();
            self.tour.restart(true);
        }

        if (tourSteps && self.user.isCountrySupported()) {
            $timeout(function () {tourActivate(tourSteps)}, 1000);
        }

        if (!self.user.isCountrySupported()) {
            self.changeCountry();
            $timeout(function () {countryTourActivate()}, 1000);
        }

        function gameTourActivate() {
            // BootstrapTour is not compatible with z-index based layout
            // so adding position:static for this case makes the browser
            // to ignore the property
            var section = angular.element('.wrapper > section');
            section.css({'position': 'static'});
            // finally restore on destroy and reuse the value declared in stylesheet
            $scope.$on('$destroy', function(){
                section.css({'position': ''});
            });
            var tour = new Tour({
                //backdrop: true,
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
                steps: [
                {
                    element: 'li[sref="app.games"]',
                    title: "Add games",
                    content: "You need to specify which games you have and specify which games you wish by clicking in the menu on the left.",
                    placement: 'right'
                }
            ]});
            tour.init();
            tour.start();
            tour.restart(true);
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

        GamesService.getPlatforms().then(function (platforms) {
            self.allPlatforms = platforms;
        });

        self.updateUser = function (updateMap) {
            $('.profile-loading').fadeIn();
            UsersService.updateUser(self.user).then(function (user) {
                //Notify.alert("Your profile data has been successfully saved.", {status: 'success'});
                $('.profile-loading').fadeOut();
                $('#change-country-form').slideUp();
                self.countryTour.end();
                self.searchText = user.address.geocoder_address;
                self.errors = {};
                self.user = user;
                $rootScope.user = user;
                // $rootScope.$apply(function () {
                //     $rootScope.user = user;
                // });

                if (updateMap) {
                    setupUserMap(user);
                }
                if (self.makeGameTour && self.user.isProfileComplete()) {
                    self.tour.end();
                    gameTourActivate();
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
                self.countryTour.end();
                if (a.address && a.address.length) {
                    self.errors = {addressGlobal: a.address};
                } else {
                    self.errors = a;
                }
            });
        };

        function setupUserMap(user) {
            if (!user.address.latitude || !user.address.longitude) return;
            var userPosition = new google.maps.LatLng(user.address.latitude,
                                                      user.address.longitude);
            var userMarker;
            self.userMapOptions.center = userPosition;
            if (self.mapMarkers.length) {
                self.mapMarkers[0].setMap(null);
                self.mapMarkers = [];
            }
            $timeout(function () {
                userMarker = new google.maps.Marker({map: self.userMap, position: userPosition, title: user.name, visible:true});
                self.mapMarkers.push(userMarker);
                var userInfoWindow = new google.maps.InfoWindow({
                    content: user.address.address1
                });
                userInfoWindow.open(self.userMap, userMarker);
                $timeout(function () {
                    google.maps.event.trigger(self.userMap, 'resize');
                });
            });
        }
        self.userMapOptions = {
            zoom: 14,
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
