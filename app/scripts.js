"use strict";

var app = angular.module("app", [ "ngRoute", "ngSanitize", "ui.bootstrap" ]);

app.config([ "$tooltipProvider", "$routeProvider", "$httpProvider", "$locationProvider", function($tooltipProvider, $routeProvider, $httpProvider, $locationProvider) {
    $tooltipProvider.options({
        popupDelay: 500
    });
    $httpProvider.defaults.withCredentials = true;
    $routeProvider.when("/flags", {
        title: "Flags",
        templateUrl: "app/modules/flags.html",
        resolve: {
            dataService: function(dataService) {
                return dataService.init();
            }
        }
    }).when("/flyer", {
        title: "Flyer",
        templateUrl: "app/modules/flyer.html",
        resolve: {
            dataService: function(dataService) {
                return dataService.init();
            }
        }
    }).when("/success", {
        title: "Thank you",
        templateUrl: "app/modules/success.html",
        resolve: {
            dataService: function(dataService) {
                return dataService.init();
            }
        }
    }).otherwise({
        redirectTo: "/flags"
    });
} ]);

app.run([ "$route", "$rootScope", function($route, $rootScope) {
    $rootScope.$on("$routeChangeSuccess", function(event, current, previous) {
        $rootScope.title = "Troop 581 - " + current.$$route.title;
    });
} ]);

toastr.options = {
    closeButton: false,
    debug: false,
    positionClass: "toast-bottom-left",
    onclick: null,
    showDuration: "4000",
    hideDuration: "1000",
    timeOut: "4000",
    extendedTimeOut: "1000",
    showEasing: "linear",
    hideEasing: "linear",
    showMethod: "show",
    hideMethod: "hide"
};

app.controller("header", [ "$location", "dataService", function($location, data) {
    "use strict";
    var vm = this;
    vm.data = data;
    vm.location = $location;
    return vm;
} ]);

app.controller("shell", [ "$location", "$modal", "dataService", function($location, $modal, data) {
    "use strict";
    var vm = this;
    vm.data = data;
    vm.isActive = function(url) {
        return url === $location.path().substr(0, url.length);
    };
    vm.openSettings = function() {
        var modalInstance = $modal.open({
            templateUrl: "app/modules/settings.html",
            controller: "settings as vm"
        });
        modalInstance.result.then(function() {}, function() {});
    };
    return vm;
} ]);

app.controller("flags.boundaries", [ "dataService", "$modalInstance", "$q", function(data, $modalInstance, $q) {
    "use strict";
    var vm = this;
    vm.data = data;
    vm.close = function() {
        $modalInstance.close();
    };
    return vm;
} ]);

app.controller("flags", [ "dataService", "$q", "$modal", "$timeout", "$filter", function(data, $q, $modal, $timeout, $filter) {
    "use strict";
    var vm = this;
    vm.data = data;
    vm.autosave = function() {
        localStorage.setItem("flags.values", JSON.stringify(data.values));
    };
    vm.donate = function(e) {
        toastr.clear();
        if (!data.values.subscribe && !data.values.donate) {
            toastr.warning("", "You have not selected the flag service or a donation.");
            e.preventDefault();
            return;
        }
        if (data.values.donate && !data.values.donation) {
            toastr.warning("", "You selected to give a donation but did not enter an amount.");
            e.preventDefault();
            return;
        }
        if (data.values.donation && (!_.toNumber(data.values.donation) || parseInt(data.values.donation, 10) < 0)) {
            toastr.warning("", "Please check your donation amount. It doesn't appear to be correct.");
            e.preventDefault();
            return;
        }
        if (data.values.subscribe && vm.getTotal() < data.cost) {
            toastr.error("", "An error occurred. Please fix the data and try again.", {
                timeOut: 0
            });
            e.preventDefault();
            return;
        }
        if (vm.getTotal() < 5) {
            toastr.warning("", "$5.00 is the minimum amount we can process through PayPal.");
            e.preventDefault();
            return;
        }
        if (!data.values.name || !(data.values.address || !data.values.subscribe)) {
            toastr.warning("", "Please fill in all required fields.");
            e.preventDefault();
            return;
        }
        toastr.info("", "You will now be sent to PayPal to finish the transaction.", {
            timeOut: 0
        });
        $timeout(function() {}, 5e3);
    };
    vm.getDescription = function() {
        var desc = "";
        if (data.values.subscribe) {
            desc += data.year + " Flag Subscription";
            if (data.values.donate && data.values.donation) {
                desc += " and Donation of " + $filter("currency")(data.values.donation, "$", 2);
            }
        } else if (data.values.donate && data.values.donation) {
            desc += "Donation of " + $filter("currency")(data.values.donation, "$", 2);
        }
        return desc;
    };
    vm.getDonation = function() {
        if (_.toNumber(data.values.donation)) {
            return parseInt(data.values.donation, 10) < 0 ? 0 : parseInt(data.values.donation, 10);
        } else {
            return 0;
        }
    };
    vm.getTotal = function() {
        var total = 0;
        if (data.values.subscribe) {
            total = total + data.cost;
        }
        if (data.values.donate) {
            total = total + vm.getDonation();
        }
        return total;
    };
    vm.showBoundaries = function() {
        toastr.clear();
        var modalInstance = $modal.open({
            templateUrl: "app/modules/flags.boundaries.html",
            controller: "flags.boundaries as vm",
            size: "lg"
        });
        modalInstance.result.then(function() {}, function() {});
    };
    (function init() {
        data.values = JSON.parse(localStorage.getItem("flags.values")) || {};
        if (data.disabled) {
            data.values = {};
        }
    })();
    return vm;
} ]);

app.controller("flyer", [ "dataService", "$q", "$modal", "$timeout", "$filter", function(data, $q, $modal, $timeout, $filter) {
    "use strict";
    var vm = this;
    vm.data = data;
    return vm;
} ]);

app.controller("success", [ "dataService", "$q", "$modal", "$timeout", "$filter", function(data, $q, $modal, $timeout, $filter) {
    "use strict";
    var vm = this;
    vm.data = data;
    return vm;
} ]);

app.factory("dataService", [ "$http", "$filter", "$q", function($http, $filter, $q) {
    "use strict";
    var data = {};
    data.disabled = true;
    data.year = 2018;
    data.cost = 45;
    data.values = {};
    var JANUARY = 0, FEBRUARY = 1, MARCH = 2, APRIL = 3, MAY = 4, JUNE = 5, JULY = 6, AUGUST = 7, SEPTEMBER = 8, OCTOBER = 9, NOVEMBER = 10, DECEMBER = 11, SUNDAY = 0, MONDAY = 1, TUESDAY = 2, WEDNESDAY = 3, THURSDAY = 4, FRIDAY = 5, SATURDAY = 6, FIRST = 1, SECOND = 2, THIRD = 3, FOURTH = 4, LAST = -1;
    data.holidays = [ {
        text: "Memorial Day",
        date: getDay(LAST, MONDAY, MAY, data.year),
        dateNoYear: "Last Monday in May"
    }, {
        text: "Flag Day",
        date: moment(data.year + "-06-14"),
        dateNoYear: "June 14th"
    }, {
        text: "Independence Day",
        date: moment(data.year + "-07-04"),
        dateNoYear: "July 4th"
    }, {
        text: "Patriot Day",
        date: moment(data.year + "-09-11"),
        dateNoYear: "September 11th"
    }, {
        text: "Columbus Day",
        date: getDay(SECOND, MONDAY, OCTOBER, data.year),
        dateNoYear: "Second Monday in October"
    }, {
        text: "Veterans Day",
        date: moment(data.year + "-11-11"),
        dateNoYear: "November 11th"
    }, {
        text: "Martin Luther King, Jr. Day",
        date: getDay(THIRD, MONDAY, JANUARY, data.year + 1),
        dateNoYear: "Third Monday in January"
    }, {
        text: "Presidents' Day",
        date: getDay(THIRD, MONDAY, FEBRUARY, data.year + 1),
        dateNoYear: "Third Monday in February"
    } ];
    data.processDonation = function(url) {
        return $http.get(url).then(function(r) {
            return r;
        });
    };
    function getDay(position, weekday, month, year) {
        var date = moment().year(year).month(month).date(1).hours(0).minutes(0).seconds(0).milliseconds(0);
        if (position === -1) {
            date.endOf("month").startOf("day");
            while (date.day() !== weekday) {
                date.subtract(1, "day");
            }
        } else {
            date.date((position - 1) * 7 + 1);
            while (date.day() !== weekday) {
                date.add(1, "day");
            }
        }
        return date;
    }
    data.init = function() {};
    return data;
} ]);

app.filter("momentToString", [ "$filter", "$locale", function($filter, $locale) {
    return function(d, format) {
        if (!moment.isMoment(d)) {
            return "";
        } else {
            return d.format(format);
        }
    };
} ]);