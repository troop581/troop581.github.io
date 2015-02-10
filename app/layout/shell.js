app.controller('shell', ['$location', '$modal', 'dataService', function ($location, $modal, data) {
    'use strict';
    var vm = this;
    vm.data = data;

    vm.isActive = function (url) {
        return url === $location.path().substr(0, url.length);
    };

    vm.openSettings = function () {
        var modalInstance = $modal.open({
            templateUrl: 'app/modules/settings.html',
            controller: 'settings as vm'
        });

        modalInstance.result.then(function () {
        }, function () {
        });
    };

    return vm;
}]);

