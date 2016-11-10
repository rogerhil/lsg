/*!
 * 
 * Let'SwapGames
 * 
 * Version: 0.1
 * Author: @letswapgames.com
 * Website: http://www.letswapgames.com
 * 
 */

// APP START
// ----------------------------------- 

(function() {
    'use strict';

    angular
        .module('lsg', [
            'app.core',
            'app.routes',
            'app.sidebar',
            'app.navsearch',
            'app.preloader',
            'app.loadingbar',
            'app.translate',
            'app.settings',
            'app.maps',
            'app.utils',
            'app.material'
        ]);
})();
