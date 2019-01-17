app.filter('momentToString', ['$filter', '$locale', function ($filter, $locale) {
  return function (d, format) {
    if (!moment.isMoment(d)) {
      return '';
    } else {
      return d.format(format);
    }
  };
}]);
