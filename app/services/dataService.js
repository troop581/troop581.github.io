app.factory('dataService', ['$http', '$filter', '$q', function ($http, $filter, $q) {
  'use strict';

  var data = {};
  data.disabled = false;
  data.year = 2019;
  data.cost = 45;
  data.values = {};

  var JANUARY = 0, FEBRUARY = 1, MARCH = 2, APRIL = 3, MAY = 4, JUNE = 5, JULY = 6, AUGUST = 7, SEPTEMBER = 8, OCTOBER = 9, NOVEMBER = 10, DECEMBER = 11,
    SUNDAY = 0, MONDAY = 1, TUESDAY = 2, WEDNESDAY = 3, THURSDAY = 4, FRIDAY = 5, SATURDAY = 6,
    FIRST = 1, SECOND = 2, THIRD = 3, FOURTH = 4, LAST = -1;

  data.holidays = [
    { text: "Memorial Day", date: getDay(LAST, MONDAY, MAY, data.year), dateNoYear: 'Last Monday in May' },
    { text: "Flag Day", date: moment(data.year + "-06-14"), dateNoYear: 'June 14th' },
    { text: "Independence Day", date: moment(data.year + "-07-04"), dateNoYear: 'July 4th' },
    { text: "Patriot Day", date: moment(data.year + "-09-11"), dateNoYear: 'September 11th' },
    { text: "Columbus Day", date: getDay(SECOND, MONDAY, OCTOBER, data.year), dateNoYear: 'Second Monday in October' },
    { text: "Veterans Day", date: moment(data.year + "-11-11"), dateNoYear: 'November 11th' },
    { text: "Martin Luther King, Jr. Day", date: getDay(THIRD, MONDAY, JANUARY, data.year + 1), dateNoYear: 'Third Monday in January' },
    { text: "Presidents' Day", date: getDay(THIRD, MONDAY, FEBRUARY, data.year + 1), dateNoYear: 'Third Monday in February' }
  ];

  data.processDonation = function (url) {
    return $http.get(url).then(function (r) {
      return r;
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


  data.init = function () {
  };

  return data;
}]);