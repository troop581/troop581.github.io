app.controller('flags.boundaries', ['dataService', '$modalInstance', '$q', function (data,  $modalInstance, $q) {
    'use strict';
    var vm = this;
    vm.data = data;

    vm.close = function () {
        $modalInstance.close();
    };

    return vm;
}]);
