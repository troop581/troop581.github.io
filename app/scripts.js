///#source 1 1 /app/app.js
'use strict';

var app = angular.module('app', ['ngRoute', 'ngSanitize', 'ui.bootstrap']);

app.config(['$tooltipProvider', '$routeProvider', '$httpProvider', function ($tooltipProvider, $routeProvider, $httpProvider) {
    $tooltipProvider.options({
        popupDelay: 500
    });

    $httpProvider.defaults.withCredentials = true;

    $routeProvider.when('/flags', {
        templateUrl: 'app/modules/flags.html',
        resolve: {
            dataService: function (dataService) {
                return dataService.init();
            }
        }
    })
    .when('/calendar', {
        templateUrl: 'app/modules/calendar.html',
        resolve: {
            dataService: function (dataService) {
                return dataService.init();
            }
        }
    })
    .otherwise({ redirectTo: '/flags' });
}]);

app.run(['$route', function ($route) {

}]);

toastr.options = {
    "closeButton": false,
    "debug": false,
    "positionClass": "toast-bottom-left",
    "onclick": null,
    "showDuration": "4000",
    "hideDuration": "1000",
    "timeOut": "4000",
    "extendedTimeOut": "1000",
    "showEasing": "linear",
    "hideEasing": "linear",
    "showMethod": "show",
    "hideMethod": "hide"
};
///#source 1 1 /app/modules/calendar.js
app.controller('calendar', ['dataService', '$q', function (data, $q) {
    'use strict';
    var vm = this;
    vm.data = data;

    (function init() {

    })();

    return vm;
}]);


///#source 1 1 /app/modules/flags.js
app.controller('flags', ['dataService', '$q', '$modal', '$timeout', function (data, $q, $modal, $timeout) {
    'use strict';
    var vm = this;
    vm.data = data;
    var year = 2015;
    var JANUARY = 0, FEBRUARY = 1, MARCH = 2, APRIL = 3, MAY = 4, JUNE = 5, JULY = 6, AUGUST = 7, SEPTEMBER = 8, OCTOBER = 9, NOVEMBER = 10, DECEMBER = 11,
        SUNDAY = 0, MONDAY = 1, TUESDAY = 2, WEDNESDAY = 3, THURSDAY = 4, FRIDAY = 5, SATURDAY = 6,
        FIRST = 1, SECOND = 2, THIRD = 3, FOURTH = 4, LAST = -1;
    vm.holidays = [
        { text: "Memorial Day", date: getDay(LAST, MONDAY, MAY, year) },
        { text: "Flag Day", date: moment(year + "-06-14") },
        { text: "Independence Day", date: moment(year + "-07-04") },
        { text: "Patriot Day", date: moment(year + "-09-11") },
        { text: "Columbus Day", date: getDay(SECOND, MONDAY, OCTOBER, year) },
        { text: "Veterans Day", date: moment(year + "-11-11") },
        { text: "Martin Luther King, Jr. Day", date: getDay(SECOND, MONDAY, JANUARY, year + 1) },
        { text: "Presidents' Day", date: getDay(THIRD, MONDAY, FEBRUARY, year + 1) }
    ];

    vm.autosave = function () {
        localStorage.setItem('flags.values', JSON.stringify(data.values));
    };

    vm.donate = function (e) {
        toastr.clear();
        if (!data.values.subscribe && !data.values.donate) {
            toastr.warning('', 'You have not selected the flag service or a donation.');
            e.preventDefault();
            return;
        }
        if (!!data.values.donate && !data.values.donation) {
            toastr.warning('', 'You selected to give a donation but did not enter an amount.');
            e.preventDefault();
            return;
        }
        if (!data.values.name || !data.values.address || !data.values.phone) {
            toastr.warning('', 'Please fill in all required fields.');
            e.preventDefault();
            return;
        }
        if (!!data.values.donation && (!_.isFinite(data.values.donation) || parseFloat(data.values.donation) < 0)) {
            toastr.warning('', "Please check your donation amount. It doesn't appear to be correct.");
            e.preventDefault();
            return;
        }
        if (data.values.subscribe && vm.getTotal() < 40) {
            toastr.error('', 'An error occurred. Please fix the data and try again.', { timeOut: 0 });
            e.preventDefault();
            return;
        }
        if (vm.getTotal() < 5) {
            toastr.warning('', '$5.00 is the minimum amount we can process through PayPal.');
            e.preventDefault();
            return;
        }
        toastr.info('', 'You will now be sent to PayPal to finish the transaction.', { timeOut: 0 });
        $timeout(function () {

        }, 5000);
    };

    vm.getAmount = function () {
        return '39.99';
    };

    vm.getDescription = function () {
        return '2015 Flags';
    };

    vm.getDonation = function () {
        if (_.isFinite(data.values.donation)) {
            return parseFloat(data.values.donation) < 0 ? 0 : parseFloat(data.values.donation);
        } else {
            return 0;
        }
    };

    vm.getTotal = function () {
        var total = 0;
        if (data.values.subscribe) {
            total = total + 40;
        }
        if (data.values.donate) {
            total = total + vm.getDonation();
        }
        return total;
    };

    vm.showBoundaries = function () {
        toastr.clear();
        var modalInstance = $modal.open({
            templateUrl: 'app/modules/flags.boundaries.html',
            controller: 'flags.boundaries as vm',
            size: 'lg'
        });

        modalInstance.result.then(function () {
        }, function () {

        });
    };

    function getDay(position, weekday, month, year) {
        var date = moment().year(year).month(month).date(1).hours(0).minutes(0).seconds(0).milliseconds(0);
        if (position === -1) {
            date.endOf('month').startOf('day');
            while (date.day() !== weekday) {
                date.subtract(1, 'day');
            }
        } else {
            date.date((position - 1) * 7 + 1);
            while (date.day() !== weekday) {
                date.add(1, 'day');
            }
        }
        return date;
    }

    (function init() {
        data.values = JSON.parse(localStorage.getItem('flags.values')) || {};
    })();

    return vm;
}]);


///#source 1 1 /app/modules/flags.boundaries.js
app.controller('flags.boundaries', ['dataService', '$modalInstance', '$q', function (data,  $modalInstance, $q) {
    'use strict';
    var vm = this;
    vm.data = data;

    vm.close = function () {
        $modalInstance.close();
    };

    (function init() {
    })();

    return vm;
}]);

///#source 1 1 /app/layout/header.js
app.controller('header', ['$location', 'dataService', function ($location, data) {
    'use strict';
    var vm = this;

    vm.data = data;
    vm.location = $location;

    return vm;
}]);
///#source 1 1 /app/layout/shell.js
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


///#source 1 1 /app/services/dataService.js
app.factory('dataService', ['$http', '$filter', '$q', function ($http, $filter, $q) {
    'use strict';

    var data = {};
    data.values = {};

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
///#source 1 1 /app/services/directives.js
'use strict';

app.directive('dropTarget', function ($q) {
    return {
        restrict: 'A',
        scope: {
            drop: '&'
        },
        link: function (scope, el, attrs, controller) {
            var counter = 0;
            el.bind("dragover", function (e) {
                if (e.preventDefault) { e.preventDefault(); } // Necessary. Allows us to drop.
                if (e.stopPropogation) { e.stopPropogation(); } // Necessary. Allows us to drop.
                e.originalEvent.dataTransfer.dropEffect = 'copy';
            });

            el.bind("dragenter", function (e) {
                counter++;
                if (e.preventDefault) { e.preventDefault(); } // Necessary. Allows us to drop.
                if (e.stopPropogation) { e.stopPropogation(); } // Necessary. Allows us to drop.
                e.originalEvent.dataTransfer.dropEffect = 'copy';
                angular.element(e.currentTarget).addClass('alert-success');
                angular.element(e.currentTarget).removeClass('alert-info');
            });

            el.bind("dragleave", function (e) {
                counter--;
                if (counter === 0) {
                    angular.element(e.currentTarget).addClass('alert-info');
                    angular.element(e.currentTarget).removeClass('alert-success');
                }
                if (e.preventDefault) { e.preventDefault(); } // Necessary. Allows us to drop.
                if (e.stopPropogation) { e.stopPropogation(); } // Necessary. Allows us to drop.
                e.originalEvent.dataTransfer.dropEffect = 'copy';
            });

            el.bind("drop", function (e) {

                if (e.preventDefault) { e.preventDefault(); } // Necessary. Allows us to drop.
                if (e.stopPropogation) { e.stopPropogation(); } // Necessary. Allows us to drop.
                angular.element(e.currentTarget).addClass('alert-info');
                angular.element(e.currentTarget).removeClass('alert-success');

                var files = e.originalEvent.dataTransfer.files;
                scope.$apply(function () {
                    scope.drop({ files: files });
                });
            });

        }
    }
});

app.directive('floatThead', function () {
    return {
        restrict: 'A',
        link: function (scope, elem, attrs) {
            $(elem).floatThead();
        }
    }
});

///#source 1 1 /app/services/filters.js
app.filter('momentToString', ['$filter', '$locale', function ($filter, $locale) {
    return function (d, format) {
        if (!moment.isMoment(d)) {
            return '';
        } else {
            return d.format(format);
        }
    };
}]);

app.filter('porgSite', ['$filter', function ($filter) {
    return function (sites, porg) {
        var output = [];
        _.forEach(sites, function (s) {
            if (porg === 'all' || s.parentPOrg === porg) {
                output.push(s);
            }
        });
        return output;
    };
}]);

