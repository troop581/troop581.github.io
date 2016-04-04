﻿app.controller('requirements.show', ['dataService', '$modalInstance', '$q', 'badge', function (data, $modalInstance, $q, badge) {
    'use strict';
    var vm = this;
    vm.data = data;
    vm.title = '';
    vm.badge = badge;

    vm.close = function () {
        $modalInstance.close();
    };

    $modalInstance.rendered.then(function () {
        $('#requirements').html(badge.requirements);
        $('#requirements table').removeAttr('style');
        $('#requirements a').replaceWith(function () {
            return $(this)[0].innerText;
        });
    });

    (function init() {

    })();

    return vm;
}]);
