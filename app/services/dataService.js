app.factory('dataService', ['$http', '$filter', '$q', function ($http, $filter, $q) {
    'use strict';

    var data = {};
    data.donationStatus = 'subscribe';

    data.processDonation = function (url) {
        return $http.get(url).then(function (r) {
            return r;
        });
    };

    data.init = function () {
        if (data.initialized) return;
    };

    return data;
}]);