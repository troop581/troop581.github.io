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
