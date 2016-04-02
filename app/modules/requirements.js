app.controller('requirements', ['dataService', '$q', function (data, $q) {
    'use strict';
    var vm = this;
    vm.data = data;

    vm.meritBadgeList = [];

    function getMeritBadges() {
        return data.getWebpage('meritbadge.org/wiki/index.php/Merit_Badges').then(function (webpage) {
            console.log('got merit badges...hopefully');
        });
    }

    (function init() {
        getMeritBadges();
    })();

    return vm;
}]);

