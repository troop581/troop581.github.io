app.controller('document', ['dataService', '$q', '$routeParams', '$filter', '$location', function (data, $q, $routeParams, $filter, $location) {
    'use strict';
    var vm = this;
    vm.data = data;
    vm.processing = false;
    vm.uploaded = false;

    vm.drop = function (files) {
        if (files.length === 1) {
            vm.file = files[0];
            vm.uploaded = false;
        } else if (files.length > 1) {
            toastr.clear();
            toastr.error('', 'Please select only one file.', { timeOut: 0 });
        }
    };

    vm.upload = function () {
        vm.processing = true;
        toastr.clear();
        toastr.info('', 'Uploading ' + vm.file.name, { timeOut: 0 });

        data.fetchToken().then(function () {
            var config = { headers: { 'slug': 'smw - Test,' + vm.file.name + ',AMAT,11/20/2014,11/20/2015', 'x-csrf-token': data.token } };
            data.uploadDocument(vm.file, config).then(function (r) {
                vm.uploaded = true;
                toastr.clear();
                toastr.success('Document ' + $filter('removeZeros')(r.data.d.Documentnumber) + ' created', vm.file.name + ' successfully uploaded!');
            }, function (r) {
                toastr.clear();
                toastr.error('Error ' + r.status, 'An unknown error occurred.', { timeOut: 0 });
            }).finally(function () {
                vm.processing = false;
            });
        });
    };

    (function init() {
    })();

    return vm;
}]);