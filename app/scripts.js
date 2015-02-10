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
///#source 1 1 /app/modules/flags.js
app.controller('flags', ['dataService', '$q', function (dataService, $q) {
    'use strict';
    var vm = this;
    vm.data = dataService;

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
/// <reference path="../../scripts/moment.min.js" />
/// <reference path="../../scripts/angular.min.js" />
app.filter('alphanumeric', ['$filter', function ($filter) {
    return function (s) {
        return s.replace(/[^a-z0-9]/gmi, '');
    };
}]);

app.filter('csiPsi', ['$filter', function ($filter) {
    return function (pOrg) {
        if (pOrg === 'S044') { return 'CSI'; }
        if (pOrg === 'S048') { return 'PSI'; }
        return pOrg;
    };
}]);

app.filter('deleted', ['$filter', function ($filter) {
    return function (c) {
        switch (c) {
            case 'X':
                return '<i class="fa fa-trash-o"></i>';
            case 'x':
                return '<i class="fa fa-trash-o"></i>';
            case 'L':
                return '<i class="fa fa-trash-o"></i>';
            case 'l':
                return '<i class="fa fa-trash-o"></i>';
            case 'S':
                return '<i class="fa fa-lock"></i>';
            case 's':
                return '<i class="fa fa-lock"></i>';
            default:
                return '&nbsp;';
        }
    };
}]);

app.filter('display', ['$filter', '$locale', function ($filter, $locale) {
    return function (b) {
        if (!b) {
            return '';
        }
        return b;
    };
}]);

app.filter('docCategory', ['$filter', function ($filter) {
    return function (c) {
        switch (c) {
            case 'B':
                return 'PR';
            case 'F':
                return 'PO';
            default:
                return '';
        }
    };
}]);

app.filter('downloadCmCcm', ['$filter', function ($filter) {
    return function (o) {
        return (o.Description + ' - ' + o.PurGroup) || '';
    };
}]);

app.filter('downloadExcelDate', ['$filter', function ($filter) {
    return function (date) {
        if (!date) return;
        return Math.floor(25569 + (moment(moment(date) - moment().zone() * 60000).valueOf() / (86400000)));
    }
}]);

app.filter('downloadText', ['$filter', function ($filter) {
    return function (o) {
        return o.text || '';
    };
}]);

app.filter('downloadUom', ['$filter', function ($filter) {
    return function (o) {
        return o.uom.value || '';
    };
}]);

app.filter('objToArray', ['$filter', function ($filter) {
    return function (obj) {
        if (!(obj instanceof Object)) { return obj; }
        return _.values(obj);
    };
}]);

app.filter('parseLongText', ['$filter', function ($filter) {
    return function (s) {
        return s.replace(/[|]/gmi, '\n');
    };
}]);

app.filter('parseDate', ['$filter', '$locale', function ($filter, $locale) {
    return function (d) {
        if (!d) {
            return '';
        }
        var m;
        if (typeof d === 'string' && d.indexOf('/Date') > -1) {
            m = moment(moment(d).valueOf() + moment(d).zone() * 60000);
        } else {
            m = moment(d);
        }
        return m.format('YYYY/MM/DD');
    };
}]);

app.filter('parseDateString', ['$filter', '$locale', function ($filter, $locale) {
    return function (d) {
        if (!d) {
            return '';
        }
        var m;
        if (typeof d === 'string' && d.indexOf('/Date') > -1) {
            m = moment(moment(d).valueOf() + moment(d).zone() * 60000);
        } else {
            m = moment(d);
        }
        return m.format('MM/DD/YYYY');
    };
}]);

app.filter('parseTime', ['$filter', '$locale', function ($filter, $locale) {
    return function (s) {
        if (!s) {
            return '';
        }
        if (s.match(/PT\d\dH\d\dM\d\dS/)) {
            return s.substr(2, 2) + ":" + s.substr(5, 2) + ":" + s.substr(8, 2);
        }
        return s;
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

app.filter('purchOrg', ['$filter', function ($filter) {
    return function (pOrg) {
        if (pOrg === 'S044') { return { value: pOrg, text: 'CSI' }; }
        if (pOrg === 'S048') { return { value: pOrg, text: 'PSI' }; }
        return { value: pOrg, text: pOrg };
    };
}]);

app.filter('releaseStatus', ['$filter', function ($filter) {
    return function (c) {
        switch (c) {
            case 'C':
                return '<i class="fa fa-check"></i>';
            case 'R':
                return '<i class="fa fa-times"></i>';
            default:
                return '';
        }
    };
}]);

app.filter('removeZeros', ['$filter', '$locale', function (filter, locale) {
    return function (numString) {
        var value = numString + '';
        while (value.charAt(0) === '0') {
            value = value.substring(1, value.length);
        }
        return value;
    };
}]);

app.filter('saveLongText', ['$filter', function ($filter) {
    return function (s) {
        return s.replace(/[\n]/gmi, '|');
    };
}]);

app.filter('selected', ['$filter', function ($filter) {
    return function (list) {
        if (!!list && list.length > 0) {
            var Selected = _.where(list, { Selected: true });
            return Selected.length;
        }
        return 0;
    };
}]);

app.filter('showDash', ['$filter', function ($filter) {
    return function (value) {
        if (!value || value === '0') {
            return '-';
        }
        return value;
    };
}]);

app.filter('stringDate', ['$filter', '$locale', function (filter, locale) {
    return function (s) {
        if (!s) {
            return '';
        }
        var d = new Date(s);
        return d;
    };
}]);

app.filter('toX', ['$filter', function (filter) {
    return function (b) {
        return b ? 'X' : '';
    };
}]);

app.filter('yesNo', ['$filter', function (filter) {
    return function (s) {
        return s ? 'Yes' : 'No';
    };
}]);
