app.controller('requirements', ['dataService', '$q', function (data, $q) {
    'use strict';
    var vm = this;
    vm.data = data;
    vm.meritBadges = {}
    vm.meritBadgeUrl = 'meritbadge.org/wiki/index.php/Merit_Badges';

    vm.meritBadgeList = [];

    function getMeritBadges() {
        return data.getWebpage(url, 'ol').then(function (ol) {
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
                    vm.meritBadges[li.a.content] = {
                        name: li.a.content,
                        url: 'meritbadge.org' + _.get(li, 'a.href'),
                        encodedName: _.replace(_.get(li, 'a.href'), '/wiki/index.php/', '')
                    }
                }
            });
            return $q.all(_.map(vm.meritBadges, function (badge) {
                return $q.all({
                    requirements: data.getWebpage(badge.url, 'table').then(function (table) {
                        var listTable;
                        table = _.castArray(table);
                        _.forEach(table, function (table) {
                            if (_.has(table, 'tbody.tr.td.a.name') && _.includes(_.get(table, 'tbody.tr.td.a.name'), 'merit_badge_requirements')) {
                                listTable = table;
                                return false;
                            }
                        });
                        if (listTable) {
                            vm.meritBadges[badge.name].requirements = listTable;
                        }
                    }),
                    image: data.getWebpage(badge.url, 'img').then(function (img) {
                        var mbImg;
                        img = _.castArray(img);
                        _.forEach(img, function (img) {
                            if (img.src && _.includes(img.src, badge.encodedName)) {
                                mbImg = img;
                                return false;
                            }
                        });
                        if (mbImg) {
                            vm.meritBadges[badge.name].imgUrl = mbImg.src;
                        }
                    })
                });
            }));
        });
    }

    (function init() {
        getMeritBadges();
    })();

    return vm;
}]);

