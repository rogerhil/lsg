(function () {
    'use strict';

    angular
        .module('app.customSettings')
        .run(customSettingsRun);

    customSettingsRun.$inject = ['$rootScope', 'ConstantsService', 'VersionService'];

    function customSettingsRun($rootScope, ConstantsService, VersionService) {

        $rootScope.constants = {};

        ConstantsService.get().then(function (constants) {
           $rootScope.constants = constants;
        });

        // Hides/show user avatar on sidebar from any element
        $rootScope.toggleUserBlock = function () {
            $rootScope.$broadcast('toggleUserBlock');
        };

        // Global Settings
        // -----------------------------------
        $rootScope.app = {
            name: "Let'SwapGames",
            description: 'Free for life, for gamers by gamers',
            year: ((new Date()).getFullYear()),
            layout: {
                isFixed: true,
                isCollapsed: false,
                isBoxed: false,
                isRTL: false,
                horizontal: false,
                isFloat: false,
                asideHover: false,
                theme: null,
                asideScrollbar: false,
                isCollapsedText: false
            },
            useFullLayout: false,
            hiddenFooter: false,
            offsidebarOpen: false,
            asideToggled: false,
            viewAnimation: 'ng-fadeInUp',
            incVersion: VersionService.getIncVersion()
        };

        if ($rootScope.user === undefined || $rootScope.user == null) {
            //window.location = '/app/#/sign-in';
        }
        
        var Status = {
            pending: 1,
            cancelled: 2,
            ongoing: 3,
            refused: 4,
            finalizing: 5,
            succeeded: 6,
            failed: 7,
            expired: 8,
            archived: 9
        };

        Status.open_statuses = [Status.pending, Status.ongoing,
            Status.finalizing];
        Status.closed_statuses = [Status.cancelled, Status.refused,
            Status.succeeded, Status.failed, Status.expired];
        Status.finalized_statuses = [Status.succeeded, Status.failed];
        Status.ongoing_statuses = [Status.ongoing, Status.finalizing];

        $rootScope.StatusLabelClasses = {
            1: 'label-warning',                // pending
            2: 'label-default bg-primary',     // cancelled
            3: 'label-info',                   // ongoing
            4: 'label-danger',                 // refused
            5: 'label-default bg-green-light', // finalizing
            6: 'label-success',                // succeeded
            7: 'label-default bg-gray-darker', // failed
            8: 'label-default bg-purple-dark', // expired
            9: 'label-default bg-gray-light'   // archived
        };

        $rootScope.StatusIcons = {
            1: 'fa fa-ellipsis-h',             // pending
            2: 'fa fa-close',                  // cancelled
            3: 'fa fa-thumbs-up',              // ongoing
            4: 'fa fa-thumbs-down',            // refused
            5: 'fa fa-gavel',                  // finalizing
            6: 'fa fa-check',                  // succeeded
            7: 'fa fa-chain-broken',           // failed
            8: 'fa fa-clock-o',                // expired
            9: 'fa fa-archive'                 // archived
        };


        $rootScope.Status = Status;

        // Setup the layout mode
        $rootScope.app.layout.horizontal = ( $rootScope.$stateParams.layout === 'app-h');


        // Restore layout settings [*** UNCOMMENT TO ENABLE ***]
        // if( angular.isDefined($localStorage.layout) )
        //   $rootScope.app.layout = $localStorage.layout;
        // else
        //   $localStorage.layout = $rootScope.app.layout;
        //
        // $rootScope.$watch('app.layout', function () {
        //   $localStorage.layout = $rootScope.app.layout;
        // }, true);

        // Close submenu when sidebar change from collapsed to normal
        $rootScope.$watch('app.layout.isCollapsed', function (newValue) {
            if (newValue === false)
                $rootScope.$broadcast('closeSidebarMenu');
        });

    }

})();
