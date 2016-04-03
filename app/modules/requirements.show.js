app.controller('requirements.show', ['dataService', '$modalInstance', '$q', 'badge', function (data,  $modalInstance, $q, badge) {
    'use strict';
    var vm = this;
    vm.data = data;
    vm.title = '';
    vm.badge = badge;

    vm.close = function () {
        $modalInstance.close();
    };

    $modalInstance.rendered.then(function () {
        $('#requirements').html(badge.requirements[0].outerHTML);
        $('#requirements table:first tr:first').remove();
        $('#requirements table:last').remove();
        $('#requirements table div:last').remove();
        $('#requirements table').removeAttr('style');
    });

    (function init() {
        
    })();

    return vm;
}]);
