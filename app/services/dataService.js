app.factory('dataService', ['$http', '$filter', '$q', function ($http, $filter, $q) {
    'use strict';

    var data = {};
    data.values = {};
    data.active = true;

    data.getWebpage = function (url, classToGet) {
        return $http.get("https://query.yahooapis.com/v1/public/yql?q=SELECT%20*%20FROM%20data.html.cssselect%20WHERE%20url%3D'" + encodeURI(url) + "'%20AND%20css%3D'" + classToGet + "'&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys", { withCredentials: false }).then(function (r) {
            return r.data.query.results.results[classToGet];
        });
    }

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