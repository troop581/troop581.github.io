app.controller('requirements', ['dataService', '$q', '$modal', function (data, $q, $modal) {
    'use strict';
    var vm = this;
    vm.data = data;
    vm.meritBadgeUrl = 'meritbadge.org/wiki/index.php/Merit_Badges';

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
                        data.meritBadges[badge.name].requirements = $(document).find('table').has('.mw-headline');
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
            });
        }).finally(function (r) {
            data.processingRequirements = false;
        });
    }

    (function init() {
        if (!data.requirementsRetrieved && !data.processingRequirements) {
            getMeritBadges();
        }
    })();

    return vm;
}]);

