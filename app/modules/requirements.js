app.controller('requirements', ['dataService', '$q', '$modal', function (data, $q, $modal) {
    'use strict';
    var vm = this;
    vm.data = data;
    vm.meritBadgeUrl = 'meritbadge.org/wiki/index.php/Merit_Badges';
    vm.rankUrl = 'meritbadge.org/wiki/index.php/Main_Page';

    vm.refresh = function () {
        data.processingRequirements = true;
        return $q.all({
            ranks: getRanks(),
            meritBadges: getMeritBadges()
        }).then(function (r) {
            data.processingRequirements = false;
        });
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
                localStorage.setItem('meritBadges', JSON.stringify(data.meritBadges));
            });
        });
    }

    function getRanks() {
        data.ranks = {
            'Scout': { order: 1, name: 'Scout', url: 'meritbadge.org/wiki/index.php/Scout_Badge', encodedName: 'BoyScout', type: 'Rank' },
            'Tenderfoot': { order: 2, name: 'Tenderfoot', url: 'meritbadge.org/wiki/index.php/Tenderfoot_rank', encodedName: 'Tenderfoot', type: 'Rank' },
            'Second Class': { order: 3, name: 'Second Class', url: 'meritbadge.org/wiki/index.php/Second_Class_rank', encodedName: 'SecondClass', type: 'Rank' },
            'First Class': { order: 4, name: 'First Class', url: 'meritbadge.org/wiki/index.php/First_Class_rank', encodedName: 'FirstClass', type: 'Rank' },
            'Star': { order: 5, name: 'Star', url: 'meritbadge.org/wiki/index.php/Star_rank', encodedName: 'Star', type: 'Rank' },
            'Life': { order: 6, name: 'Life', url: 'meritbadge.org/wiki/index.php/Life_rank', encodedName: 'Life', type: 'Rank' },
            'Eagle': { order: 7, name: 'Eagle', url: 'meritbadge.org/wiki/index.php/Eagle_Scout_rank', encodedName: 'EagleScout', type: 'Rank' },
            'Eagle Palms': { order: 8, name: 'Eagle Palms', url: 'meritbadge.org/wiki/index.php/Eagle_Palms', encodedName: 'Eagle_Palms', type: 'Palm' }
        };
        return $q.all(_.map(data.ranks, function (badge) {
            return $q.all({
                requirements: data.getWebpage(badge.url, 'table', 'xml').then(function (document) {
                    var table = $(document).find('table').has('.mw-headline');
                    var firstTrHtml = ($(table).find('tr:first')[0] && $(table).find('tr:first')[0].outerHTML) || '';
                    var lastTableHtml = ($(table).find('table:last')[0] && $(table).find('table:last')[0].outerHTML) || '';
                    var lastDivHtml = ($(table).find('div:last')[0] && $(table).find('div:last')[0].outerHTML) || '';

                    var tableHtml = $(document).find('table').has('.mw-headline')[0].outerHTML;
                    var tableHtml = _.replace(tableHtml, firstTrHtml, '');
                    var tableHtml = _.replace(tableHtml, lastTableHtml, '');
                    var tableHtml = _.replace(tableHtml, lastDivHtml, '');
                    data.ranks[badge.name].requirements = tableHtml;
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
                        data.ranks[badge.name].imgUrl = '//meritbadge.org' + mbImg.src;
                    }
                })
            }).then(function (r) {
                data.ranks[badge.name].ready = true;
            });
        })).then(function (r) {
            localStorage.setItem('ranks', JSON.stringify(data.ranks));
        });
    }

    (function init() {
        if (!data.processingRequirements && _.isEmpty(data.meritBadges) && _.isEmpty(data.ranks)) {
            vm.refresh();
        }
    })();

    return vm;
}]);

