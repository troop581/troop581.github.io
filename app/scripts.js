'use strict';

var app = angular.module('app', ['ngRoute', 'ngSanitize', 'ui.bootstrap']);

app.config(['$tooltipProvider', '$routeProvider', '$httpProvider', '$locationProvider', function ($tooltipProvider, $routeProvider, $httpProvider, $locationProvider) {
    $tooltipProvider.options({
        popupDelay: 500
    });

    $httpProvider.defaults.withCredentials = true;

    $routeProvider.when('/flags', {
        title: 'Flags',
        templateUrl: 'app/modules/flags.html',
        resolve: {
            dataService: function (dataService) {
                return dataService.init();
            }
        }
    })
    .when('/flyer', {
        title: 'Flyer',
        templateUrl: 'app/modules/flyer.html',
        resolve: {
            dataService: function (dataService) {
                return dataService.init();
            }
        }
    })
    .when('/success', {
        title: 'Thank you',
        templateUrl: 'app/modules/success.html',
        resolve: {
            dataService: function (dataService) {
                return dataService.init();
            }
        }
    })
    .when('/calendar', {
        title: 'Calendar',
        templateUrl: 'app/modules/calendar.html',
        resolve: {
            dataService: function (dataService) {
                return dataService.init();
            }
        }
    })
    .when('/requirements', {
        title: 'Requirements',
        templateUrl: 'app/modules/requirements.html',
        resolve: {
            dataService: function (dataService) {
                return dataService.init();
            }
        }
    })
    .otherwise({ redirectTo: '/flags' });
}]);

app.run(['$route', '$rootScope', function ($route, $rootScope) {
    $rootScope.$on('$routeChangeSuccess', function (event, current, previous) {
        $rootScope.title = 'Troop 581 - ' + current.$$route.title;
    });
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
app.controller('header', ['$location', 'dataService', function ($location, data) {
    'use strict';
    var vm = this;

    vm.data = data;
    vm.location = $location;

    return vm;
}]);
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


app.controller('calendar', ['dataService', '$q', function (data, $q) {
    'use strict';
    var vm = this;
    vm.data = data;

    (function init() {

    })();

    return vm;
}]);


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

app.controller('flags', ['dataService', '$q', '$modal', '$timeout', '$filter', function (data, $q, $modal, $timeout, $filter) {
    'use strict';
    var vm = this;
    vm.data = data;

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
        if (data.values.donate && !data.values.donation) {
            toastr.warning('', 'You selected to give a donation but did not enter an amount.');
            e.preventDefault();
            return;
        }
        if (data.values.donation && (!_.toNumber(data.values.donation) || parseInt(data.values.donation, 10) < 0)) {
            toastr.warning('', "Please check your donation amount. It doesn't appear to be correct.");
            e.preventDefault();
            return;
        }
        if (data.values.subscribe && vm.getTotal() < data.cost) {
            toastr.error('', 'An error occurred. Please fix the data and try again.', { timeOut: 0 });
            e.preventDefault();
            return;
        }
        if (vm.getTotal() < 5) {
            toastr.warning('', '$5.00 is the minimum amount we can process through PayPal.');
            e.preventDefault();
            return;
        }
        if (!data.values.name || !(data.values.address || !data.values.subscribe)) {
            toastr.warning('', 'Please fill in all required fields.');
            e.preventDefault();
            return;
        }
        toastr.info('', 'You will now be sent to PayPal to finish the transaction.', { timeOut: 0 });
        $timeout(function () {

        }, 5000);
    };

    //vm.getAmount = function () {
    //    var amount = 0;
    //    if (data.values.subscribe) {
    //        amount += data.cost;
    //        if (data.values.donate && data.values.donation) {
    //            amount += parseInt(data.values.donation, 10);
    //        }
    //    } else if (data.values.donate && data.values.donation) {
    //        amount += parseInt(data.values.donation, 10);
    //    }
    //    return amount;
    //};

    vm.getDescription = function () {
        var desc = '';
        if (data.values.subscribe) {
            desc += data.year + ' Flag Subscription';
            if (data.values.donate && data.values.donation) {
                desc += ' and Donation of ' + $filter('currency')(data.values.donation, '$', 2);
            }
        } else if (data.values.donate && data.values.donation) {
            desc += 'Donation of ' + $filter('currency')(data.values.donation, '$', 2);
        }
        return desc;
    };

    vm.getDonation = function () {
        if (_.toNumber(data.values.donation)) {
            return parseInt(data.values.donation, 10) < 0 ? 0 : parseInt(data.values.donation, 10);
        } else {
            return 0;
        }
    };

    vm.getTotal = function () {
        var total = 0;
        if (data.values.subscribe) {
            total = total + data.cost;
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

    (function init() {
        data.values = JSON.parse(localStorage.getItem('flags.values')) || {};
    })();

    return vm;
}]);


app.controller('flyer', ['dataService', '$q', '$modal', '$timeout', '$filter', function (data, $q, $modal, $timeout, $filter) {
    'use strict';
    var vm = this;
    vm.data = data;

    (function init() {
        
    })();

    return vm;
}]);


app.controller('requirements', ['dataService', '$q', '$modal', function (data, $q, $modal) {
    'use strict';
    var vm = this;
    vm.data = data;
    vm.meritBadgeUrl = 'meritbadge.org/wiki/index.php/Merit_Badges';

    vm.refresh = function () {
        getMeritBadges();
    };

    vm.showRequirements = function (badge) {
        var modalInstance = $modal.open({
            templateUrl: 'app/modules/requirements.show.html',
            controller: 'requirements.show as vm',
            size: 'lg',
            resolve: {
                badge: function () {
                    return badge;
                }
            }

        });

        modalInstance.result.then(function () {
        }, function () {

        });
    };

    function getMeritBadges() {
        data.processingRequirements = true;
        data.meritBadges = {};
        return data.getWebpage(vm.meritBadgeUrl, 'ol', 'json').then(function (ol) {
            var list;
            ol = _.castArray(ol);
            _.forEach(ol, function (ol) {
                if (ol.li && ol.li.length > 100) {
                    list = ol.li;
                    return false;
                }
            });
            _.forEach(list, function (li) {
                if (_.has(li, 'a.content')) {
                    data.meritBadges[li.a.content] = {
                        name: li.a.content,
                        url: 'meritbadge.org' + _.get(li, 'a.href'),
                        encodedName: _.replace(_.get(li, 'a.href'), '/wiki/index.php/', ''),
                        type: 'Merit Badge'
                    }
                } else if (_.has(li, 'i.b.a.content')) {
                    data.meritBadges[li.i.b.a.content] = {
                        name: li.i.b.a.content,
                        url: 'meritbadge.org' + _.get(li, 'i.b.a.href'),
                        encodedName: _.replace(_.get(li, 'i.b.a.href'), '/wiki/index.php/', ''),
                        type: 'Merit Badge',
                        required: true
                    }
                }
            });
            return $q.all(_.map(data.meritBadges, function (badge) {
                return $q.all({
                    requirements: data.getWebpage(badge.url, 'table', 'xml').then(function (document) {
                        var table = $(document).find('table').has('.mw-headline');
                        var firstTrHtml =  ($(table).find('tr:first')[0] && $(table).find('tr:first')[0].outerHTML) || '';
                        var lastTableHtml = ($(table).find('table:last')[0] && $(table).find('table:last')[0].outerHTML) || '';
                        var lastDivHtml = ($(table).find('div:last')[0] && $(table).find('div:last')[0].outerHTML) || '';

                        var tableHtml = $(document).find('table').has('.mw-headline')[0].outerHTML;
                        var tableHtml = _.replace(tableHtml, firstTrHtml, '');
                        var tableHtml = _.replace(tableHtml, lastTableHtml, '');
                        var tableHtml = _.replace(tableHtml, lastDivHtml, '');
                        data.meritBadges[badge.name].requirements = tableHtml;
                    }),
                    image: data.getWebpage(badge.url, 'img', 'json').then(function (img) {
                        var mbImg;
                        img = _.castArray(img);
                        _.forEach(img, function (img) {
                            if (img.src && _.includes(img.src, badge.encodedName)) {
                                mbImg = img;
                                return false;
                            }
                        });
                        if (mbImg) {
                            data.meritBadges[badge.name].imgUrl = '//meritbadge.org' + mbImg.src;
                        }
                    })
                }).then(function (r) {
                    data.meritBadges[badge.name].ready = true;
                });
            })).then(function (r) {
                data.requirementsRetrieved = true;
                localStorage.setItem('meritBadges', JSON.stringify(data.meritBadges));
            });
        }).finally(function (r) {
            data.processingRequirements = false;
        });
    }

    (function init() {
        if (!data.requirementsRetrieved && !data.processingRequirements && _.isEmpty(data.meritBadges)) {
            getMeritBadges();
        }
    })();

    return vm;
}]);


app.controller('requirements.show', ['dataService', '$modalInstance', '$q', 'badge', function (data,  $modalInstance, $q, badge) {
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
    });

    (function init() {
        
    })();

    return vm;
}]);

app.controller('success', ['dataService', '$q', '$modal', '$timeout', '$filter', function (data, $q, $modal, $timeout, $filter) {
    'use strict';
    var vm = this;
    vm.data = data;

    (function init() {
    })();

    return vm;
}]);


app.factory('dataService', ['$http', '$filter', '$q', function ($http, $filter, $q) {
    'use strict';

    var data = {};
    data.year = 2016;
    data.cost = 45;
    data.meritBadges = {}
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

    data.getWebpage = function (url, selector, format) {
        return $http.get("https://query.yahooapis.com/v1/public/yql?q=SELECT%20*%20FROM%20data.html.cssselect%20WHERE%20url%3D'" + encodeURI(url) + "'%20AND%20css%3D'" + selector + "'&format=" + format + "&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys", { withCredentials: false }).then(function (r) {
            if (format === 'json') {
                return r.data.query.results.results[selector];
            } else {
                return $.parseXML(r.data);
            }
        });
    }

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
        data.meritBadges = JSON.parse(localStorage.getItem('meritBadges')) || {};
    };

    return data;
}]);
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

app.filter('momentToString', ['$filter', '$locale', function ($filter, $locale) {
    return function (d, format) {
        if (!moment.isMoment(d)) {
            return '';
        } else {
            return d.format(format);
        }
    };
}]);

app.filter('objToArray', ['$filter', function ($filter) {
    return function (obj) {
        if (!(obj instanceof Object)) { return obj; }
        return _.values(obj);
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