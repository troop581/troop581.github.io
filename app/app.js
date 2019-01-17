'use strict';

var app = angular.module('app', ['ngRoute', 'ngSanitize', 'ui.bootstrap']);

app.config(['$tooltipProvider', '$routeProvider', '$httpProvider', '$locationProvider', function ($tooltipProvider, $routeProvider, $httpProvider, $locationProvider) {
  $tooltipProvider.options({
    popupDelay: 500
  });

  $httpProvider.defaults.withCredentials = true;

  $routeProvider.when('/flags', {
    title: 'Flags',
    templateUrl: 'app/modules/flags.html',
    resolve: {
      dataService: function (dataService) {
        return dataService.init();
      }
    }
  })
    .when('/flyer', {
      title: 'Flyer',
      templateUrl: 'app/modules/flyer.html',
      resolve: {
        dataService: function (dataService) {
          return dataService.init();
        }
      }
    })
    .when('/success', {
      title: 'Thank you',
      templateUrl: 'app/modules/success.html',
      resolve: {
        dataService: function (dataService) {
          return dataService.init();
        }
      }
    })
    .otherwise({ redirectTo: '/flags' });
}]);

app.run(['$route', '$rootScope', function ($route, $rootScope) {
  $rootScope.$on('$routeChangeSuccess', function (event, current, previous) {
    $rootScope.title = 'Troop 581 - ' + current.$$route.title;
  });
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