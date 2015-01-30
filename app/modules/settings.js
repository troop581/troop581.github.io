app.controller('settings', ['dataService', '$modalInstance', '$q', function (data,  $modalInstance, $q) {
    'use strict';
    var vm = this;
    vm.data = data;

    vm.close = function () {
        $modalInstance.close();
    };

    vm.updateSettings = function () {
        localStorage.setItem('sombrero.settings', JSON.stringify(data.settings));
    };

    (function init() {

    })();

    return vm;
}]);
