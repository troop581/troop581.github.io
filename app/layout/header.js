app.controller('header', ['$location', 'dataService', function ($location, data) {
  'use strict';
  var vm = this;

  vm.data = data;
  vm.location = $location;

  return vm;
}]);