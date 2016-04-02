'use strict';

var app = angular.module('app', ['ngRoute', 'ngSanitize', 'ui.bootstrap']);

app.config(['$tooltipProvider', '$routeProvider', '$httpProvider', '$locationProvider', function ($tooltipProvider, $routeProvider, $httpProvider, $locationProvider) {
    $tooltipProvider.options({
        popupDelay: 500
    });

    $httpProvider.defaults.withCredentials = true;

    $routeProvider.when('/flags', {
        templateUrl: 'app/modules/flags.html',
        resolve: {
            dataService: function (dataService) {
                return dataService.init();
            }
        }
    })
    .when('/flyer', {
        templateUrl: 'app/modules/flyer.html',
        resolve: {
            dataService: function (dataService) {
                return dataService.init();
            }
        }
    })
    .when('/success', {
        templateUrl: 'app/modules/success.html',
        resolve: {
            dataService: function (dataService) {
                return dataService.init();
            }
        }
    })
    .when('/calendar', {
        templateUrl: 'app/modules/calendar.html',
        resolve: {
            dataService: function (dataService) {
                return dataService.init();
            }
        }
    })
    .when('/requirements', {
        templateUrl: 'app/modules/requirements.html',
        resolve: {
            dataService: function (dataService) {
                return dataService.init();
            }
        }
    })
    .otherwise({ redirectTo: '/flags' });
}]);

app.run(['$route', function ($route) {

}]);

toastr.options = {
    "closeButton": false,
    "debug": false,
    "positionClass": "toast-bottom-left",
    "onclick": null,
    "showDuration": "4000",
    "hideDuration": "1000",
    "timeOut": "4000",
    "extendedTimeOut": "1000",
    "showEasing": "linear",
    "hideEasing": "linear",
    "showMethod": "show",
    "hideMethod": "hide"
};