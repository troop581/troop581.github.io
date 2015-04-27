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

    vm.donate = function (e) {
        toastr.clear();
        if (!data.subscribe && !data.donate) {
            toastr.warning('', 'You have not selected the flag service or a donation.');
            return;
        }
        if (!!data.donate && !data.donation) {
            toastr.warning('', 'You selected to give a donation but did not enter an amount.');
            return;
        }
        if (!data.name || !data.address || !data.phone) {
            toastr.warning('', 'Please fill in all required fields.');
            return;
        }
        if (!!data.donation && (!_.isFinite(data.donation) || parseFloat(data.donation) < 0)) {
            toastr.warning('', "Please check your donation amount. It doesn't appear to be correct.");
            return;
        }
        if (data.subscribe && vm.getTotal() < 40) {
            toastr.error('', 'An error occurred. Please fix the data and try again.', { timeOut: 0 });
            return;
        }
        if (vm.getTotal() < 5) {
            toastr.warning('', '$5.00 is the minimum amount we can process through PayPal.');
            return;
        }
        toastr.info('', 'Processing donation...', { timeOut: 0 });
        $timeout(function () {
            var formElement = angular.element(e.target);
            formElement.attr("action", "https://www.paypal.com/cgi-bin/webscr");
            formElement.submit();
        }, 500);
    };

    vm.getAmount = function () {
        return '39.99';
    };

    vm.getDescription = function () {
        return '2015 Flags';
    };

    vm.getDonation = function () {
        if (_.isFinite(data.donation)) {
            return parseFloat(data.donation) < 0 ? 0 : parseFloat(data.donation);
        } else {
            return 0;
        }
    };

    vm.getTotal = function () {
        var total = 0;
        if (data.subscribe) {
            total = total + 40;
        }
        if (data.donate) {
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

    })();

    return vm;
}]);

