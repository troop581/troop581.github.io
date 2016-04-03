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
