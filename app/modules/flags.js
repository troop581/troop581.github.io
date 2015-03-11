app.controller('flags', ['dataService', '$q', function (dataService, $q) {
    'use strict';
    var vm = this;
    vm.data = dataService;
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

