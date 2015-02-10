app.factory('dataService', ['$http', '$filter', '$q', function ($http, $filter, $q) {
    'use strict';

    var data = {};

    data.init = function () {
        if (data.initialized) return;
    };

    return data;
}]);