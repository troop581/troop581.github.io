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
///#source 1 1 /app/modules/asl.js
app.controller('asl', ['dataService', '$q', function (data, $q) {
    'use strict';
    var vm = this;
    vm.data = data;

    (function init() {

    })();

    return vm;
}]);


///#source 1 1 /app/modules/dashboard.js
app.controller('dashboard', ['dataService', '$q', '$location', '$modal', function (data, $q, $location, $modal) {
    'use strict';
    var vm = this;
    vm.data = data;
    vm.location = $location;
    vm.showOther = false;

    vm.displayBom = function (site) {
        var temp;
        data.dashboard.bomNoOa = [];
        data.dashboard.bomMultipleOa = [];
        _.forEach(data.dashboard.bomTotal, function (b) {
            temp = _.where(data.dashboard.valid, function (v) {
                return v.Material === b.value && (_.where(v.Sites, function (s) {
                    return s.site === site;
                })).length > 0;
            });
            if (temp.length === 0) {
                b.hasForecast = !!data.dashboard.rawForecasts[b.value];
                data.dashboard.bomNoOa.push(b);
            } else if (temp.length > 1) {
                b.hasForecast = !!data.dashboard.rawForecasts[b.value];
                b.lines = temp;
                data.dashboard.bomMultipleOa.push(b);
            }
        });
        _.forEach(data.dashboard.bomNoOa, function (b) {
            data.getMaterialDetails(b.value).then(function (r) {
                if (r.data) {
                    b.MMDesc = r.data.MMDesc;
                    b.SynergyLevel = r.data.SlInd;
                    b.SynergyModel = r.data.SlSupplierPartNum;
                    b.SynergySupplier = r.data.SlSupplierName;
                    b.SupItemSubcategoryNm = r.data.SupItemSubcategoryNm;
                }
            });
        });
        _.forEach(data.dashboard.bomMultipleOa, function (b) {
            data.getMaterialDetails(b.value).then(function (r) {
                if (r.data) {
                    b.MMDesc = r.data.MMDesc;
                    b.SynergyLevel = r.data.SlInd;
                    b.SynergyModel = r.data.SlSupplierPartNum;
                    b.SynergySupplier = r.data.SlSupplierName;
                    b.SupItemSubcategoryNm = r.data.SupItemSubcategoryNm;
                }
            });
        });
    };

    vm.getDashboardLines = function () {
        toastr.clear();
        toastr.info('This may take several seconds.', 'Retrieving dashboard data...', { timeOut: 0 });
        vm.processing = true;
        var timestamp = moment();
        var itemInput = '',
            extensionInput = '';

        data.dashboard.forecastDetails = [];

        itemInput = "(DocType eq 'ZCON' or DocType eq 'ZQUO')";
        if (!!data.settings.category) {
            itemInput += " and PurchOrg eq '" + encodeURIComponent(data.settings.category) + "'";
        } else {
            itemInput += " and PurchOrg eq 'S044'";
        }
        extensionInput = itemInput;
        itemInput += " and ConditionDataFlag eq 'X' and TextDataFlag eq 'X'";

        $q.all([
            $q.all([data.getLines(itemInput), data.getExtensions(extensionInput)]).then(function (r) {
                data.dashboard.timestamp = timestamp.toDate();
                data.dashboard.lines = data.mapExtensions(r[0].data, r[1].data);

                data.dashboard.valid = _.where(data.dashboard.lines, function (l) {
                    return l.DeleteInd !== 'X' && l.SIActive.value === 'X' && l.SIStatus.value === 'A';
                });

                data.dashboard.groupedLines = {};
                data.dashboard.groupedLines = _.groupBy(data.dashboard.lines, function (l) {
                    return l.PurGroup.PurGroup;
                });

                data.dashboard.groups = [];

                _.forEach(_.sortBy(_.keys(data.dashboard.groupedLines)), function (group, index, list) {
                    data.dashboard.groups[index] = {};
                    data.dashboard.groups[index].code = group;
                    data.dashboard.groups[index].label = (_.find(data.purGroup, { PurGroup: group }) && _.find(data.purGroup, { PurGroup: group }).Description) || '';
                    data.dashboard.groups[index].all = _.where(data.dashboard.groupedLines[group], function (l) {
                        return l.DeleteInd !== 'X';
                    });
                    data.dashboard.groups[index].preferred = _.where(data.dashboard.groups[index].all, function (l) {
                        return l.SIActive.value === 'X';
                    });
                    data.dashboard.groups[index].notPreferred = _.where(data.dashboard.groups[index].all, function (l) {
                        return l.SIActive.value === 'N';
                    });
                    data.dashboard.groups[index].obsolete = _.where(data.dashboard.groups[index].all, function (l) {
                        return l.SIActive.value === 'O';
                    });
                    data.dashboard.groups[index].other = _.where(data.dashboard.groups[index].all, function (l) {
                        return l.SIActive.value !== 'X' && l.SIActive.value !== 'N' && l.SIActive.value !== 'O';
                    }); 
                    data.dashboard.groups[index].preferredApproved = _.where(data.dashboard.groups[index].all, function (l) {
                        return l.SIActive.value === 'X' && l.SIStatus.value === 'A';
                    });
                    data.dashboard.groups[index].notApproved = _.where(data.dashboard.groups[index].all, function (l) {
                        return l.SIStatus.value !== 'A';
                    });
                    data.dashboard.groups[index].pendingCm = _.where(data.dashboard.groups[index].all, function (l) {
                        return l.SICMApproval.value === 'P';
                    });
                    data.dashboard.groups[index].pendingSite = _.where(data.dashboard.groups[index].all, function (l) {
                        return l.SISiteApproval.value === 'P';
                    });
                    data.dashboard.groups[index].pendingTd = _.where(data.dashboard.groups[index].all, function (l) {
                        return l.SITDApproval.value === 'P';
                    });
                });

                data.dashboard.statusFilter = _.find(data.dashboard.groups, { code: data.settings.cm && data.settings.cm.PurGroup });
                vm.updateShowOther(data.dashboard.statusFilter);
                toastr.clear();
                toastr.success('', 'Dashboard data retrieved!');
                vm.processing = false;
                data.dashboard.loaded = true;
            }),
            data.getBom().then(function (r) {
                data.dashboard.bomCount = _.countBy(r.data, 'value');
                data.dashboard.bomTotal = _.forEach(_.toArray(_.indexBy(r.data, 'value')), function (l) {
                    l.count = data.dashboard.bomCount[l.value];
                });
            }),
            data.getForecasts(data.fixedVal.forecast[$location.host()]).then(function (r) {
                data.dashboard.rawForecasts = r.data;
            })
        ]).then(function (r) {
            buildOutForecasts();
            vm.displayBom(data.dashboard.bomSite);
        });
        
    };

    vm.getDays = function (days) {
        if (!!days && (parseInt(days, 10) === 1 || parseInt(days, 10) === -1)) {
            return 'day';
        } else {
            return 'days';
        }
    };

    vm.relatedOas = function (material) {
        var modalInstance = $modal.open({
            templateUrl: 'app/modules/dashboard.mm.html',
            controller: 'dashboard.mm as vm',
            size: 'lg',
            resolve: {
                material: function () {
                    return material;
                }
            }
        });

        modalInstance.result.then(function () {
        }, function () {

        });
    };

    vm.updateShowOther = function (group) {
        var show = false;
        if (!!group) {
            if (!!group.other && group.other.length > 0) {
                show = true;
            }
        } else {
            _.forEach(data.dashboard.groups, function (group) {
                if (group.other.length > 0) {
                    show = true;
                    return false;
                }
            });
        }
        vm.showOther = show;
    };

    vm.viewStatus = function (lines) {
        if (lines.length > 0) {
            data.contractLines = lines;
            data.search.expanded = false;
            $location.path('/search');
        }
    };

    function buildOutForecasts() {
        data.dashboard.forecasts = {};
        data.dashboard.forecasts.cm = {};
        data.dashboard.forecasts.all = [];
        data.dashboard.forecasts.singleOa = [];
        data.dashboard.forecasts.noOa = [];
        data.dashboard.forecasts.multipleOa = [];
        data.dashboard.forecastGroup = {};

        var materialLines, materialSiteLines, oaLine, forecast, forecastGroups;
        _.forEach(data.dashboard.rawForecasts, function (material, materialId) {
            materialLines = _.where(data.dashboard.valid, function (v) {
                return v.Material === materialId;
            });
            _.forEach(material, function (site, siteId) {
                materialSiteLines = _.where(materialLines, function (line) {
                    return (_.where(line.Sites, function (s) {
                        return s.sloc === siteId;
                    })).length > 0;
                });
                _.forEach(site, function (rdd, date) {
                    forecast = {
                        material: materialId,
                        site: siteId,
                        rdd: date,
                        qty: rdd
                    };
                    if (materialSiteLines.length === 1) {
                        oaLine = materialSiteLines[0];
                        forecast.oaLine = oaLine;
                        forecast.site = _.find(oaLine.Sites, { sloc: siteId }) || { site: siteId };
                        forecast.oaStart = moment.max(moment(oaLine.VperStart), moment(oaLine.ConditionStart)).format('YYYY-MM-DD');
                        forecast.oaEnd = moment.min(moment(oaLine.VperEnd), moment(oaLine.ConditionEnd)).format('YYYY-MM-DD');
                        forecast.pnd = moment(forecast.rdd).subtract(oaLine.PlanDel, 'days').subtract(forecast.site.ShippingCondition.transitTime, 'days').subtract(data.fixedVal.defaults.emsPndBuffer, 'days').format('YYYY-MM-DD');
                        forecast.pndInPast = moment(forecast.pnd).isBefore(moment(), 'day');
                        if (forecast.pndInPast) {
                            forecast.dueDate = forecast.oaEnd;
                            forecast.invalidOa = moment(forecast.oaStart).isAfter(moment(), 'day') || moment(forecast.oaEnd).isBefore(moment(), 'day');
                        } else {
                            forecast.dueDate = moment(forecast.pnd).subtract(data.fixedVal.defaults.forecastBuffer, 'days').format('YYYY-MM-DD');
                            forecast.invalidOa = moment(forecast.oaStart).isAfter(moment(forecast.pnd), 'day') || moment(forecast.oaEnd).isBefore(moment(forecast.pnd), 'day');
                        }
                        forecast.daysToPnd = moment(forecast.pnd).startOf('day').diff(moment().startOf('day'), 'days');
                        forecast.daysToDue = moment(forecast.dueDate).startOf('day').diff(moment().startOf('day'), 'days');
                        forecast.withinNotice = forecast.daysToDue <= forecast.oaLine.SIITMRequotingTime;
                        forecast.actionNeeded = (forecast.invalidOa || forecast.pndInPast) && forecast.withinNotice;
                        forecast.overdue = forecast.daysToDue < 1;
                        forecast.expired = moment(forecast.oaEnd).isBefore(moment(), 'day');
                        data.dashboard.forecasts.singleOa.push(forecast);
                        if (!data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup]) {
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup] = {};
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].label = forecast.oaLine.PurGroup.Description;
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].code = forecast.oaLine.PurGroup.PurGroup;
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].allSites = {};
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].allSites.all = [];
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].allSites.actionNeeded = [];
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].allSites.almostDue = [];
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].allSites.due = [];
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].allSites.pastDuePndFuture = [];
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].allSites.pastDuePndPast = [];
                        }
                        if (!data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site]) {
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site] = {};
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site].all = [];
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site].actionNeeded = [];
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site].almostDue = [];
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site].due = [];
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site].pastDuePndFuture = [];
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site].pastDuePndPast = [];
                        }
                        data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].allSites.all.push(forecast);
                        data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site].all.push(forecast);
                        if (forecast.actionNeeded) {
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].allSites.actionNeeded.push(forecast);
                            data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site].actionNeeded.push(forecast);
                            if (forecast.daysToDue > parseInt(data.fixedVal.defaults.daysToDue, 10)) {
                                data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].allSites.almostDue.push(forecast);
                                data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site].almostDue.push(forecast);
                            } else if (forecast.daysToDue > 0) {
                                data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].allSites.due.push(forecast);
                                data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site].due.push(forecast);
                            } else {
                                if (forecast.daysToPnd > 0) {
                                    data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].allSites.pastDuePndFuture.push(forecast);
                                    data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site].pastDuePndFuture.push(forecast);
                                } else {
                                    data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup].allSites.pastDuePndPast.push(forecast);
                                    data.dashboard.forecasts.cm[forecast.oaLine.PurGroup.PurGroup][forecast.site.site].pastDuePndPast.push(forecast);
                                }
                            }
                        }
                    } else if (materialSiteLines.length < 1) {
                        data.dashboard.forecasts.noOa.push(forecast);
                    } else {
                        forecast.oaLines = materialSiteLines;
                        forecast.site = _.find(materialSiteLines[0].Sites, { sloc: siteId }) || { site: siteId };
                        data.dashboard.forecasts.multipleOa.push(forecast);
                    }
                    data.dashboard.forecasts.all.push(forecast);
                });
            });
        });

        _.forEach(data.dashboard.forecasts.cm, function (cm, cmId) {
            data.dashboard.forecastGroup[cmId] = {};
            data.dashboard.forecastGroup[cmId].allSites = {};
            data.dashboard.forecastGroup[cmId].allSites.all = [];
            data.dashboard.forecastGroup[cmId].allSites.actionNeeded = [];
            data.dashboard.forecastGroup[cmId].allSites.almostDue = [];
            data.dashboard.forecastGroup[cmId].allSites.due = [];
            data.dashboard.forecastGroup[cmId].allSites.pastDuePndFuture = [];
            data.dashboard.forecastGroup[cmId].allSites.pastDuePndPast = [];
            data.dashboard.forecastGroup[cmId].label = cm.label;
            data.dashboard.forecastGroup[cmId].code = cm.code;
            forecastGroups = _.groupBy(cm.allSites.all, function (f) {
                return f.oaLine.Contract + '_' + f.oaLine.ItemNo;
            });
            _.forEach(forecastGroups, function (group) {
                forecast = {};
                forecast.oaLine = group[0].oaLine;
                forecast.material = group[0].material;
                forecast.oaStart = group[0].oaStart;
                forecast.oaEnd = group[0].oaEnd;
                forecast.expired = group[0].expired;
                forecast.siteString = _.sortBy(_.uniq(_.map(group, function (f) { return f.site.site }))).join(', ');
                forecast.qty = _.reduce(group, function (sum, f) { return sum + f.qty }, 0);
                forecast.pndInPast = _.some(group, 'pndInPast');
                forecast.invalidOa = _.some(group, 'invalidOa');
                forecast.actionNeeded = _.some(group, 'actionNeeded');
                forecast.withinNotice = _.some(group, 'withinNotice');
                forecast.overdue = _.some(group, 'overdue');
                var earliestPnd = _.min(group, 'daysToPnd');
                forecast.pnd = earliestPnd.pnd;
                forecast.daysToPnd = earliestPnd.daysToPnd;
                var earliestDue = _.min(group, 'daysToDue');
                forecast.dueDate = earliestDue.dueDate;
                forecast.daysToDue = earliestDue.daysToDue;
                var latestPnd = _.max(group, 'daysToPnd');
                forecast.latestPnd = latestPnd.pnd;
                forecast.daysToLatestPnd = latestPnd.daysToPnd;
                data.dashboard.forecastGroup[cmId].allSites.all.push(forecast);
                if (forecast.actionNeeded) {
                    data.dashboard.forecastGroup[cmId].allSites.actionNeeded.push(forecast);
                    if (forecast.daysToDue > parseInt(data.fixedVal.defaults.daysToDue, 10)) {
                        data.dashboard.forecastGroup[cmId].allSites.almostDue.push(forecast);
                    } else if (forecast.daysToDue > 0) {
                        data.dashboard.forecastGroup[cmId].allSites.due.push(forecast);
                    } else {
                        if (forecast.daysToPnd > 0) {
                            data.dashboard.forecastGroup[cmId].allSites.pastDuePndFuture.push(forecast);
                        } else {
                            data.dashboard.forecastGroup[cmId].allSites.pastDuePndPast.push(forecast);
                        }
                    }
                }
            });
        });

        data.dashboard.forecastCm = data.dashboard.forecasts.cm[data.settings.cm && data.settings.cm.PurGroup];
        
        data.materialIndex = _.groupBy(data.dashboard.forecasts.multipleOa, 'material');
        _.forEach(data.materialIndex, function (m, materialId) {
            data.getMaterialDetails(materialId).then(function (r) {
                data.materialIndex[materialId] = {};
                if (r.data) {
                    data.materialIndex[materialId].MMDesc = r.data.MMDesc;
                    data.materialIndex[materialId].SynergyLevel = r.data.SlInd;
                    data.materialIndex[materialId].SynergyModel = r.data.SlSupplierPartNum;
                    data.materialIndex[materialId].SynergySupplier = r.data.SlSupplierName;
                    data.materialIndex[materialId].SupItemSubcategoryNm = r.data.SupItemSubcategoryNm;
                }
            });
        });
    }

    (function init() {
        vm.updateShowOther(data.dashboard.statusFilter);
        if (data.settings.autoPull && !data.dashboard.loaded) {
            vm.getDashboardLines();
        }
    })();

    return vm;
}]);
///#source 1 1 /app/modules/dashboard.mm.js
app.controller('dashboard.mm', ['material', 'dataService', '$modalInstance', '$q', function (material, data,  $modalInstance, $q) {
    'use strict';
    var vm = this;
    vm.data = data;
    vm.material = material;
    vm.relatedOas = [];
    vm.processing = false;

    var itemFields = 'Contract,ItemNo,DocType,VendorName,VperStart,VperEnd,PurchOrg,Material,ShortText,ConditionStart,ConditionEnd,VendMat,SIActive,SIStatus,DeleteInd',
        extensionFields = 'Contract,ItemNo,Plant,StgeLoc,DeletionInd';

    vm.close = function () {
        $modalInstance.close();
    };

    function getContractLines () {
        vm.processing = true;
        var itemInput = '',
            extensionInput = '';
        itemInput = "(DocType eq 'ZCON' or DocType eq 'ZQUO') and Material eq '" + material + "'";
        extensionInput = itemInput;
        itemInput += " and ConditionDataFlag eq 'X' and TextDataFlag eq 'X'";

        $q.all([data.getLines(itemInput), data.getExtensions(extensionInput)]).then(function (r) {
            vm.relatedOas = data.mapExtensions(r[0].data, r[1].data);
        }).finally(function (r) {
            vm.processing = false;
        });
    };

    (function init() {
        getContractLines();
    })();

    return vm;
}]);

///#source 1 1 /app/modules/document.js
app.controller('document', ['dataService', '$q', '$routeParams', '$filter', '$location', function (data, $q, $routeParams, $filter, $location) {
    'use strict';
    var vm = this;
    vm.data = data;
    vm.processing = false;
    vm.uploaded = false;

    vm.drop = function (files) {
        if (files.length === 1) {
            vm.file = files[0];
            vm.uploaded = false;
        } else if (files.length > 1) {
            toastr.clear();
            toastr.error('', 'Please select only one file.', { timeOut: 0 });
        }
    };

    vm.upload = function () {
        vm.processing = true;
        toastr.clear();
        toastr.info('', 'Uploading ' + vm.file.name, { timeOut: 0 });

        data.fetchToken().then(function () {
            var config = { headers: { 'slug': 'smw - Test,' + vm.file.name + ',AMAT,11/20/2014,11/20/2015', 'x-csrf-token': data.token } };
            data.uploadDocument(vm.file, config).then(function (r) {
                vm.uploaded = true;
                toastr.clear();
                toastr.success('Document ' + $filter('removeZeros')(r.data.d.Documentnumber) + ' created', vm.file.name + ' successfully uploaded!');
            }, function (r) {
                toastr.clear();
                toastr.error('Error ' + r.status, 'An unknown error occurred.', { timeOut: 0 });
            }).finally(function () {
                vm.processing = false;
            });
        });
    };

    (function init() {
    })();

    return vm;
}]);
///#source 1 1 /app/modules/outlineAgreement.js
app.controller('outlineAgreement', ['dataService', '$q', '$routeParams', '$filter', '$location', '$anchorScroll', function (data, $q, $routeParams, $filter, $location, $anchorScroll) {
    'use strict';
    var vm = this;
    vm.data = data;
    vm.processing = false;
    vm.validating = false;

    vm.uoms = [];
    _.forEach(data.fixedVal.uom, function (u) {
        vm.uoms.push({ uom: u });
    });

    vm.rABS = typeof FileReader !== "undefined" && typeof FileReader.prototype !== "undefined" && typeof FileReader.prototype.readAsBinaryString !== "undefined";

    vm.activateContractLine = function (l) {
        data.activeContractLine = l;
        vm.updateMaterial(l);
        vm.getDocument(l);
    };

    vm.cancelOa = function () {
        data.contractReady = false;
        data.editContract = false;
        data.contractCheckAll = false;
        data.contract = {};
        toastr.clear();
        toastr.info('', 'OA canceled');
    };

    vm.changeChecked = function () {
        if (data.contractCheckAll) {
            for (var i = 0; i < data.filteredContractLines.length; i++) {
                data.filteredContractLines[i].Selected = true;
            }
        } else {
            for (var i = 0; i < data.contract.Lines.length; i++) {
                data.contract.Lines[i].Selected = false;
            }
        }
    };

    vm.changeContract = function (oa, line) {
        if (!!oa) {
            data.contractReady = false;
            data.editContract = false;
            data.contractFilter = {};
            toastr.clear();
            toastr.info('', 'Retrieving OA ' + oa, { timeOut: 0 });
            getContract(oa, line);
        }
    };

    vm.changeLine = function (line) {
        var i = _.findIndex(data.contract.Lines, { ItemNo: data.activeContractLine.ItemNo });
        if (line === false) {
            if (i === 0) {
                i = data.contract.Lines.length - 1;
            } else {
                i = i - 1;
            }
            if (!!data.contract.Lines[i]) {
                vm.activateContractLine(data.contract.Lines[i]);
            }
        } else if (line === true) {
            if (i === data.contract.Lines.length - 1) {
                i = 0;
            } else {
                i = i + 1;
            }
            if (!!data.contract.Lines[i]) {
                vm.activateContractLine(data.contract.Lines[i]);
            }
        } else if (_.isNumber(parseInt(line, 10)) && !_.isNaN(parseInt(line, 10))) {
            i = _.findIndex(data.contract.Lines, { ItemNo: parseInt(line, 10) });
            if (!!data.contract.Lines[i]) {
                vm.activateContractLine(data.contract.Lines[i]);
            }
        }
        vm.gotoLine = '';
    };

    vm.changePorg = function () {
        _.forEach(data.contract.Lines, function (l) {
            l.AllSites = _.clone(_.where(data.fixedVal.sites, { parentPOrg: data.contract.PurchOrg }).length > 0 ? _.where(data.fixedVal.sites, { parentPOrg: data.contract.PurchOrg }) : _.where(data.fixedVal.sites, { pOrg: data.contract.PurchOrg }), true);
            l.SiteString = '';
            _.forEach(l.AllSites, function (s) {
                s.ShippingCondition = _.find(data.fixedVal.shipCond, { default: 'true' }) || { value: '', text: '', transitTime: '' };
            });
        });
        if (data.contract.PurchOrg === 'S044') {
            _.forEach(data.contract.Lines, function (l) {
                if (!l.SIITMRequotingTime || l.SIITMRequotingTime === '0') {
                    l.SIITMRequotingTime = '7';
                }
            });
        }
    };

    vm.cleanPrice = function (line) {
        if (!!line.NetPrice) {
            line.NetPrice = line.NetPrice.toString().replace(/[^\d.]/g, '');
        }
    };

    vm.closeAlert = function () {
        data.activeContractLine.Errors.length = 0;
    };

    vm.commentsRequired = function (just, list) {
        if (data.contract.PurchOrg === 'S044' && just === _.last(list)) {
            return true;
        }
        return false;
    };

    vm.deleteLine = function (line) {
        if (data.contract.PurchOrg === 'S044' && line.DeleteInd === 'X') {
            toastr.warning('Please ensure you have given a reason for deletion in the comments, along with the replacement contract and line if available.', 'Line ' + line.ItemNo + ' deleted', { timeOut: 0 });
        }
    };

    vm.discardChanges = function () {
        data.contractReady = false;
        data.editContract = false;
        toastr.clear();
        toastr.info('', 'Re-pulling OA ' + data.contract.Contract);
        getContract(data.contract.Contract);
    };

    vm.download = function () {
        var workbook = {},
            columnFields = data.fixedVal.oaXlsx,
            columnSites = _.sortBy(_.where(data.fixedVal.sites, { parentPOrg: data.contract.PurchOrg }).length > 0 ? _.where(data.fixedVal.sites, { parentPOrg: data.contract.PurchOrg }) : _.where(data.fixedVal.sites, { pOrg: data.contract.PurchOrg }), 'site');

        workbook.SheetNames = [];
        workbook.SheetNames[0] = data.contract.Contract;
        workbook.Sheets = {};
        workbook.Sheets[workbook.SheetNames[0]] = {};
        var sheet = workbook.Sheets[workbook.SheetNames[0]];

        //***** TODO: write comments into header fields *****//

        var colIndex = 0,
            colString = '';
        //item fields headers
        _.forEach(columnFields, function (field) {
            if (field.value === 'Sites') {
                //site headers
                _.forEach(columnSites, function (site) {
                    colString = getExcelColumn(colIndex);
                    sheet[(colString + '1')] = {
                        v: site.site,
                        t: 's',
                        z: 'General'
                    };
                    //site data
                    _.forEach(data.filteredContractLines, function (data, j) {
                        sheet[colString + (j + 2)] = {
                            v: !!(_.find(data.Sites, { site: site.site })) ? _.find(data.Sites, { site: site.site }).ShippingCondition.value : '',
                            t: 's',
                            z: 'General'
                        }
                    });
                    colIndex++;
                });
            } else {
                colString = getExcelColumn(colIndex);
                sheet[(colString + '1')] = {
                    v: field.text,
                    t: 's',
                    z: 'General'
                };
                //item fields data
                var cell;
                _.forEach(data.filteredContractLines, function (data, j) {
                    cell = {
                        t: field.type,
                        z: field.z
                    };
                    if (!!field.filter) {
                        cell.v = $filter(field.filter)(data[field.value]);
                    } else {
                        cell.v = (typeof data[field.value] === 'object' ? data[field.value].value : data[field.value]) || '';
                    }
                    sheet[colString + (j + 2)] = cell;
                });
                colIndex++;
            }
        });

        sheet['!ref'] = 'A1:' + getExcelColumn(colIndex - 1) + (data.filteredContractLines.length + 1);
        var workbookOutput = XLSX.write(workbook, { bookType: 'xlsx', bookSST: false, type: 'binary' });
        saveAs(new Blob([s2ab(workbookOutput)], { type: '' }), 'OA ' + data.contract.Contract + '.xlsx');

        if (data.filteredContractLines.length < data.contract.Lines.length) {
            toastr.clear();
            toastr.info('', 'This data is currently filtered. Only the filtered lines have been downloaded.', { timeOut: 5000 });
        }
    };

    vm.drop = function (files) {
        var deferred = $q.defer();
        var reader = new FileReader();
        reader.onload = function (e) {
            var result,
                workbook,
                sheetName,
                wbJson;
            result = e.target.result;
            if (vm.rABS) {
                workbook = XLSX.read(result, { cellNF: true, cellStyles: true, type: 'binary' });
            } else {
                workbook = XLSX.read(arrayBufferToBase64(result), { cellNF: true, cellStyles: true, type: 'base64' });
            }
            sheetName = workbook.SheetNames[0];
            wbJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true });
            importLines(wbJson, files[0].name);
            deferred.resolve();
        };
        if (files.length === 1) {
            if (files[0].type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                toastr.clear();
                toastr.info('', 'Importing ' + files[0].name, { timeOut: 0 });
                if (vm.rABS) {
                    reader.readAsBinaryString(files[0]);
                } else {
                    reader.readAsArrayBuffer(files[0]);
                }
            } else {
                toastr.clear();
                toastr.error('', 'Only XLSX files can be uploaded.', { timeOut: 0 });
            }
        } else {
            toastr.clear();
            toastr.error('', 'Please select only one file.', { timeOut: 0 });
        }
        return deferred.promise;
    };

    vm.editContract = function () {
        data.contractUnchanged = _.clone(data.contract, true);
        data.editContract = true;
    };

    vm.firstHalf = function (i, length) {
        return i + 1 <= Math.ceil(length / 2);
    };

    vm.getAltUomText = function (u, material) {
        if (!material || !material.MMBaseUom) {
            return '';
        }
        if (u.uom.value === material.MMBaseUom) {
            return '[Base UOM]';
        }
        return '[' + (u.altAmt && u.altAmt.toString() !== '1' ? (uom.altAmt.toString() + ' ' + u.uom.value + ' = ') : '') + (u.baseAmt && u.baseAmt.toString()) + ' ' + material.MMBaseUom + ']';
    };

    vm.getDocument = function (line, dateWarning, showError) {
        line.datesOverwritten = false;
        if (!!line.QuoteDIR) {
            return data.getDocument(line.QuoteDIR).then(function (r) {
                line.ReferencedQuote = r.data.Description;
                if (data.editContract) {
                    if (!(moment(r.data.QuoteValidFrom).isSame(moment(line.ConditionStart), 'day')) || !(moment(r.data.QuoteValidTo).isSame(moment(line.ConditionEnd), 'day'))) {
                        line.ConditionStart = r.data.QuoteValidFrom;
                        line.ConditionEnd = r.data.QuoteValidTo;
                        line.datesOverwritten = true;
                        if (dateWarning) {
                            toastr.warning('Line start/end dates have been overwritten from the Quote Document', 'Line ' + line.ItemNo, { timeOut: 6000 });
                        }
                    }
                }
                return $q.when(line);
            }, function (r) {
                line.ReferencedQuote = '';
                if (showError) {
                    toastr.warning('', 'Quote ' + line.QuoteDIR + ' does not exist');
                    line.QuoteDIR = '';
                }
                return $q.reject(line);
            }).finally(function (r) {
                vm.updateApproveStatus(line);
            });
        } else {
            line.ReferencedQuote = '';
            vm.updateApproveStatus(line);
            return $q.when(line);
        }
    };

    vm.getSortClass = function (field) {
        if (data.contractOrderByField !== field) {
            return 'fa-sort';
        } else {
            if (data.contractReverseSort) {
                return 'fa-sort-amount-desc';
            } else {
                return 'fa-sort-amount-asc';
            }
        }
    };

    vm.newContract = function (oa) {
        data.contractCheckAll = false;
        if (!!oa) {
            data.contract = oa;
            data.contract.Contract = '';
            data.contract.errors = null;
            _.forEach(data.contract.Lines, function (l) {
                l.NewLine = true;
                l.errors = null;
                l.OriginalSites = [];
                l.BadSites = [];
                l.Sites = [];

                var tempSites = _.where(l.AllSites, { Selected: true });
                tempSites = _.sortBy(tempSites, 'site');
                l.SiteString = _.pluck(tempSites, 'site').join(', ');
            });
        } else {
            data.contract = {};
            data.contract.Contract = '';
            data.contract.HdrSirfisFcst = 'N/A';
            data.contract.Lines = [{
                Selected: true,
                NewLine: true,
                ItemNo: parseInt(data.fixedVal.defaults.lineIncrement, 10),
                DeleteInd: '',
                Acctasscat: '',
                Material: { value: '' },
                SIActive: '',
                SIStatus: _.find(data.fixedVal.approveStatus, { value: 'A' }),
                SICMApproval: '',
                SISiteApproval: '',
                SITDApproval: '',
                ConditionStart: moment().format("MM/DD/YYYY"),
                ConditionEnd: '12/31/9999',
                ShortText: '',
                MatlGroup: '',
                ReferencedQuote: '',
                VendMat: '',
                PlanDel: '',
                NetPrice: '',
                OrderprUn: '',
                Incoterms1: '',
                Incoterms2: '',
                Shipping: _.find(data.fixedVal.shipInst, { default: 'true' }),
                SIMfrnr: '',
                SIMfrpn: '',
                SISupplierDiffJustif: '',
                SIModelDiffJustif: '',
                SISupplierDiffComment: '',
                SIModelDiffComment: '',
                SIFcstLt: '',
                SIFcstNotice: '',
                SIITMRequotingTime: data.contract.PurchOrg === 'S044' ? '7' : '',
                SICeMarking: '',
                SIMinOrderQty: '',
                AllSites: [],
                BadSites: [],
                OriginalSites: [],
                Sites: [],
                SiteString: ''
            }];
        }
        data.editContract = true;
        data.contractReady = true;
        data.contract.newContract = true;
        vm.activateContractLine(_.first(data.contract.Lines));
        //data.activeContractLine = _.first(data.contract.Lines);
    };

    vm.newLine = function (line) {
        var newLine = {};
        if (!!line) {
            newLine = _.clone(line, true);
            newLine.Selected = true;
            newLine.NewLine = true;
            newLine.errors = null;
            newLine.ItemNo = nextNumber();
            newLine.BadSites = [];
            newLine.OriginalSites = [];
            newLine.SIActive = line.SIActive;
            newLine.SICMApproval = line.SICMApproval;
            newLine.SISiteApproval = line.SISiteApproval;
            newLine.SITDApproval = line.SITDApproval;
            newLine.Material = _.clone(line.Material, true);
            newLine.OrderprUn = line.OrderprUn;
            newLine.Incoterms1 = line.Incoterms1;
            newLine.Shipping = line.Shipping;
            newLine.SICeMarking = line.SICeMarking;

            _.forEach(newLine.AllSites, function (s) {
                s.ShippingCondition = _.find(data.fixedVal.shipCond, { value: s.ShippingCondition.value });
            });

            var tempSites = _.where(newLine.AllSites, { Selected: true });
            tempSites = _.sortBy(tempSites, 'site');
            newLine.SiteString = _.pluck(tempSites, 'site').join(', ');

        } else {
            newLine = {
                Selected: true,
                NewLine: true,
                ItemNo: nextNumber(),
                DeleteInd: '',
                Acctasscat: '',
                Material: '',
                SIActive: '',
                SIStatus: '',
                SICMApproval: '',
                SISiteApproval: '',
                SITDApproval: '',
                ConditionStart: moment().format("MM/DD/YYYY"),
                ConditionEnd: '12/31/9999',
                ShortText: '',
                MatlGroup: '',
                ReferencedQuote: '',
                VendMat: '',
                PlanDel: '',
                NetPrice: '',
                OrderprUn: '',
                Incoterms1: '',
                Incoterms2: '',
                Shipping: _.find(data.fixedVal.shipInst, { default: 'true' }),
                SIMfrnr: '',
                SIMfrpn: '',
                SISupplierDiffJustif: '',
                SIModelDiffJustif: '',
                SISupplierDiffComment: '',
                SIModelDiffComment: '',
                SIFcstLt: '',
                SIFcstNotice: '',
                SIITMRequotingTime: data.contract.PurchOrg === 'S044' ? '7' : '',
                SICeMarking: '',
                SIMinOrderQty: '',
                AllSites: _.clone(_.where(data.fixedVal.sites, { parentPOrg: data.contract.PurchOrg }).length > 0 ? _.where(data.fixedVal.sites, { parentPOrg: data.contract.PurchOrg }) : _.where(data.fixedVal.sites, { pOrg: data.contract.PurchOrg }), true),
                BadSites: [],
                OriginalSites: [],
                Sites: [],
                SiteString: ''
            };
            _.forEach(newLine.AllSites, function (s) {
                s.ShippingCondition = _.find(data.fixedVal.shipCond, { default: 'true' }) || { value: '', text: '', transitTime: '' };
            });
        }
        vm.updateApproveStatus(newLine);
        data.contract.Lines.push(newLine);
        vm.activateContractLine(_.last(data.contract.Lines));
        //data.activeContractLine = _.last(data.contract.Lines);
    };

    vm.populateDescription = function (line) {
        if (!line.ShortText) {
            line.ShortText = line.Material.MMDesc || '';
        }
    };

    vm.populateForecastLt = function (line) {
        if (!line.SIFcstLt) {
            line.SIFcstLt = line.PlanDel || '';
        }
    };

    vm.populateHeaderDates = function () {
        if (data.contract.DocType === 'ZQUO') {
            !data.contract.VperStart ? data.contract.VperStart = moment().format("MM/DD/YYYY") : null;
            !data.contract.VperEnd ? data.contract.VperEnd = '12/31/9999' : null;
        }
    };

    vm.populateInco2 = function (i) {
        if (!!i.Incoterms1 && !!i.Incoterms1.inco2) {
            i.Incoterms2 = i.Incoterms1.inco2;
        } else {
            i.Incoterms2 = '';
        }
    };

    vm.populateManufName = function (line) {
        if (!line.SIMfrnr) {
            line.SIMfrnr = line.Material.SlSupplierName || '';
        }
    };

    vm.populateManufPart = function (line) {
        if (!line.SIMfrpn) {
            if (!!line.Material.SlSupplierPartNum) {
                line.SIMfrpn = line.Material.SlSupplierPartNum;
            } else {
                line.SIMfrpn = line.VendMat;
            }
        }
    };

    vm.requiredModelJustification = function (line) {
        if (data.contract.PurchOrg === 'S044' && !!line && !!line.Material && line.Material.SlInd && (line.Material.SlInd.toString().trim() === '1' || line.Material.SlInd.toString().trim() === '2') && !line.SIModelDiffJustif && line.Material.SlSupplierPartNum && line.SIMfrpn.toString().trim() !== line.Material.SlSupplierPartNum.toString().trim()) {
            return true;
        }
        return false;
    };

    vm.requiredSuppJustification = function (line){
        if (data.contract.PurchOrg === 'S044' && !!line && !!line.Material && line.Material.SlInd && (line.Material.SlInd.toString().trim() === '1' || line.Material.SlInd.toString().trim() === '2') && !line.SISupplierDiffJustif && line.Material.SlSupplierName && line.SIMfrnr.toString().trim() !== line.Material.SlSupplierName.toString().trim()) {
            return true;
        }
        return false;
    };

    vm.saveContract = function () {
        vm.processing = true;
        vm.validating = true;
        toastr.clear();
        toastr.info('', 'Validating contract...', { timeOut: 0 });
        $q.all(validate()).then(function (r) {
            vm.validating = false;
            if (data.contract.errors && data.contract.errors.length > 0) {
                toastr.clear();
                toastr.error('Please check the data.', 'The contract header has errors and cannot be updated.', { timeOut: 0 });
            } else if (_.any(_.where(data.contract.Lines, { Selected: true }), function (l) { return l.errors && l.errors.length > 0; })) {
                toastr.clear();
                toastr.error('Please check the data. You can deselect the lines with errors if you wish to save the remaining lines.', 'One or more selected contract lines have errors.', { timeOut: 0 });
            } else {
                toastr.clear();
                toastr.info('', 'Saving selected contract lines...', { timeOut: 0 });
                var d = {
                    Contract: data.contract.Contract,
                    DocType: data.contract.DocType,
                    Vendor: data.contract.Vendor,
                    CompCode: data.fixedVal.defaults.companyCode,
                    VperStart: "\/Date(" + moment(moment(data.contract.VperStart) - moment(data.contract.VperStart).zone() * 60000).valueOf() + ")\/",
                    VperEnd: "\/Date(" + moment(moment(data.contract.VperEnd) - moment(data.contract.VperEnd).zone() * 60000).valueOf() + ")\/",
                    PurchOrg: !!data.contract.PurchOrg ? data.contract.PurchOrg : '',
                    PurGroup: !!data.contract.PurGroup ? data.contract.PurGroup.PurGroup : '',
                    HdrBuyerField: !!data.contract.HdrBuyerField ? data.contract.HdrBuyerField.PurGroup : '',
                    HdrSirfisFcst: !!data.contract.HdrSirfisFcst ? data.contract.HdrSirfisFcst : '',
                    ReferencedContract: !!data.contract.ReferencedContract ? data.contract.ReferencedContract : '',
                    Incoterms1: !!data.contract.Incoterms1 ? data.contract.Incoterms1.value : '',
                    Incoterms2: !!data.contract.Incoterms2 ? data.contract.Incoterms2 : '',
                    Currency: !!data.contract.Currency ? data.contract.Currency.value : '',
                    SalesPers: !!data.contract.SalesPers ? data.contract.SalesPers : '',
                    Telephone: !!data.contract.Telephone ? data.contract.Telephone : '',
                    Pmnttrms: !!data.contract.Pmnttrms ? data.contract.Pmnttrms.value : '',
                    ContractHeaderx: {
                        Contract: 'X',
                        DocType: 'X',
                        Vendor: 'X',
                        VperStart: 'X',
                        VperEnd: 'X',
                        PurchOrg: 'X',
                        PurGroup: 'X',
                        Incoterms1: 'X',
                        Incoterms2: 'X',
                        Currency: 'X',
                        SalesPers: 'X',
                        Telephone: 'X',
                        Pmnttrms: 'X'
                    },
                    ContractItem: [],
                    ContractItemx: [],
                    ContractExtension: []
                };

                var selectedLines = _.where(data.contract.Lines, { Selected: true });
                _.forEach(selectedLines, function (o, i) {
                    var item;
                    if (data.contract.newContract) {
                        item = ((i + 1) * parseInt(data.fixedVal.defaults.lineIncrement, 10)) + '';
                    } else {
                        item = o.ItemNo + '';
                    }

                    d.ContractItem[i] = {};
                    d.ContractItem[i].Contract = data.contract.Contract;
                    d.ContractItem[i].ItemNo = item;
                    d.ContractItem[i].DeleteInd = o.DeleteInd === 'X' ? 'L' : '';
                    d.ContractItem[i].Acctasscat = data.fixedVal.defaults.accountAssignment;
                    d.ContractItem[i].Material = (o.Material && o.Material.value) + '';
                    d.ContractItem[i].SIActive = o.SIActive && o.SIActive.value || '';
                    d.ContractItem[i].SIStatus = o.SIStatus && o.SIStatus.value || '';
                    d.ContractItem[i].SICMApproval = o.SICMApproval && o.SICMApproval.value || '';
                    d.ContractItem[i].SISiteApproval = o.SISiteApproval && o.SISiteApproval.value || '';
                    d.ContractItem[i].SITDApproval = o.SITDApproval && o.SITDApproval.value || '';
                    d.ContractItem[i].ConditionStart = !!o.ConditionStart ? "\/Date(" + moment(moment(o.ConditionStart) - moment(o.ConditionStart).zone() * 60000).valueOf() + ")\/" : '';
                    d.ContractItem[i].ConditionEnd = !!o.ConditionEnd ? "\/Date(" + moment(moment(o.ConditionEnd) - moment(o.ConditionEnd).zone() * 60000).valueOf() + ")\/" : '';
                    d.ContractItem[i].ShortText = o.ShortText;
                    d.ContractItem[i].MatlGroup = data.fixedVal.defaults.materialGroup;
                    d.ContractItem[i].QuoteDIR = o.QuoteDIR + '';
                    d.ContractItem[i].ReferencedQuote = o.ReferencedQuote;
                    d.ContractItem[i].VendMat = o.VendMat;
                    d.ContractItem[i].PlanDel = o.PlanDel + '';
                    d.ContractItem[i].NetPrice = !!o.NetPrice ? o.NetPrice + '' : '0';
                    d.ContractItem[i].Currency = data.contract.Currency && data.contract.Currency.value;
                    d.ContractItem[i].OrderprUn = o.OrderprUn && o.OrderprUn.uom && o.OrderprUn.uom.value || '';
                    d.ContractItem[i].PoUnit = o.OrderprUn && o.OrderprUn.uom && o.OrderprUn.uom.value || '';
                    d.ContractItem[i].Incoterms1 = o.Incoterms1 && o.Incoterms1.value || '';
                    d.ContractItem[i].Incoterms2 = o.Incoterms2;
                    d.ContractItem[i].Shipping = o.Shipping && o.Shipping.value || '';
                    d.ContractItem[i].SIMfrnr = o.SIMfrnr;
                    d.ContractItem[i].SIMfrpn = o.SIMfrpn;
                    d.ContractItem[i].SISupplierDiffJustif = o.SISupplierDiffJustif;
                    d.ContractItem[i].SIModelDiffJustif = o.SIModelDiffJustif;
                    d.ContractItem[i].SISupplierDiffComment = o.SISupplierDiffComment;
                    d.ContractItem[i].SIModelDiffComment = o.SIModelDiffComment;
                    d.ContractItem[i].SIFcstLt = o.SIFcstLt + '';
                    d.ContractItem[i].SIFcstNotice = o.SIFcstNotice + '';
                    d.ContractItem[i].SIITMRequotingTime = o.SIITMRequotingTime + '';
                    d.ContractItem[i].SICeMarking = o.SICeMarking && o.SICeMarking.value || '';
                    d.ContractItem[i].SIMinOrderQty = !!o.SIMinOrderQty ? o.SIMinOrderQty + '' : '0';
                    d.ContractItem[i].NoteLongText = !!o.NoteLongText ? $filter('saveLongText')(o.NoteLongText) : '';
                    d.ContractItem[i].PriceUnit = data.fixedVal.defaults.priceUnit;

                    d.ContractItemx[i] = {};
                    d.ContractItemx[i].ItemNo = item;
                    d.ContractItemx[i].ItemNox = 'X';
                    d.ContractItemx[i].DeleteInd = 'X';
                    d.ContractItemx[i].Acctasscat = 'X';
                    d.ContractItemx[i].Material = 'X';
                    d.ContractItemx[i].ShortText = 'X';
                    d.ContractItemx[i].MatlGroup = 'X';
                    d.ContractItemx[i].VendMat = 'X';
                    d.ContractItemx[i].PlanDel = 'X';
                    d.ContractItemx[i].NetPrice = 'X';
                    d.ContractItemx[i].OrderprUn = 'X';
                    d.ContractItemx[i].PoUnit = 'X';
                    d.ContractItemx[i].Incoterms1 = 'X';
                    d.ContractItemx[i].Incoterms2 = 'X';
                    d.ContractItemx[i].Shipping = 'X';
                    d.ContractItemx[i].PriceUnit = 'X';

                    _.forEach(o.AllSites, function (s) {
                        var site = {};
                        site.Contract = data.contract.Contract;
                        site.ItemNo = item;
                        site.Plant = s.plant;
                        site.StgeLoc = s.sloc;
                        site.ShippingCondition = s.ShippingCondition.value;
                        site.DeletionInd = s.Selected ? '' : 'X';

                        var original = _.find(o.OriginalSites, { Plant: s.plant, StgeLoc: s.sloc });

                        if (!!original && s.Selected && (original.DeletionInd === 'X' || s.ShippingCondition.value !== original.ShippingCondition.value)) {
                            d.ContractExtension.push(site);
                        } else if (!!original && !s.Selected && original.DeletionInd === '') {
                            d.ContractExtension.push(site);
                        } else if (!original && s.Selected) {
                            d.ContractExtension.push(site);
                        }
                    });

                    _.forEach(o.BadSites, function (s) {
                        var site = {};
                        site.Contract = data.contract.Contract;
                        site.ItemNo = item;
                        site.Plant = s.plant;
                        site.StgeLoc = s.sloc;
                        site.ShippingCondition = s.ShippingCondition.value;
                        site.DeletionInd = s.Selected ? '' : 'X';

                        var original = _.find(o.OriginalSites, { Plant: s.plant, StgeLoc: s.sloc });
                        if ((!!original && !s.Selected) || (!original && s.Selected)) {
                            d.ContractExtension.push(site);
                        }
                    });

                    _.forEach(_.where(o.OriginalSites, { StgeLoc: '', DeletionInd: '' }), function (s) {
                        var site = {};
                        site.Contract = data.contract.Contract;
                        site.ItemNo = item;
                        site.Plant = s.Plant;
                        site.StgeLoc = s.StgeLoc;
                        site.ShippingCondition = s.ShippingCondition.value;
                        site.DeletionInd = 'X';

                        d.ContractExtension.push(site);
                    });
                });

                data.fetchToken().then(function () {
                    var config = { headers: { 'Content-Type': 'application/json', 'x-csrf-token': data.token } };

                    data.updateContract(d, config).then(function (r) {
                        data.editContract = false;
                        _.forEach(data.contract.Lines, function (o) {
                            if (o.Selected) {
                                o.NewLine = false;
                            }
                        });
                        toastr.clear();
                        if (data.contract.newContract) {
                            vm.changeContract(r.data.d.Contract);
                            toastr.success('', 'Contract ' + data.contract.Contract + ' created!');
                        } else {
                            toastr.success('', 'Contract ' + data.contract.Contract + ' saved!');
                        }
                        if (selectedLines.length === 0) {
                            toastr.info('', 'No lines were selected. Only header data was saved.');
                        }
                    }, function (r) {
                        toastr.clear();
                        if (r.data.hasOwnProperty('error')) {
                            if (r.data.error.innererror.errordetails.length > 0) {
                                var errormessage = [];
                                _.forEach(r.data.error.innererror.errordetails, function (e) {
                                    if (e.severity === 'error') {
                                        errormessage.push(e.message);
                                    }
                                });
                                errormessage = _.uniq(errormessage);
                                _.forEach(errormessage, function (message) {
                                    toastr.error(message, '', { timeOut: 0 });
                                });
                            } else {
                                toastr.error(r.data.error.message.value, '', { timeOut: 0 });
                            }
                        }
                        else {
                            toastr.error('Error ' + r.status, 'An unknown error occurred.', { timeOut: 0 });
                        }
                    });
                });
            }
        }).finally(function (r) {
            vm.processing = false;
        });
    };

    vm.scroll = function (id) {
        $location.hash(id);
        $anchorScroll();
    };

    vm.selectSites = function (i) {
        if (i === 'all') {
            for (var i = 0; i < data.activeContractLine.AllSites.length; i++) {
                data.activeContractLine.AllSites[i].Selected = true;
            }
        } else if (i === 'none') {
            for (var i = 0; i < data.activeContractLine.AllSites.length; i++) {
                data.activeContractLine.AllSites[i].Selected = false;
            }
        } else if (i === 'us') {
            for (var i = 0; i < data.activeContractLine.AllSites.length; i++) {
                data.activeContractLine.AllSites[i].Selected = false;
                if (data.activeContractLine.AllSites[i].pOrg === '1030' || data.activeContractLine.AllSites[i].pOrg === '1041') {
                    data.activeContractLine.AllSites[i].Selected = true;
                }
            }
        }
        vm.updateSiteString();
    };

    vm.sort = function (field) {
        if (field === data.contractOrderByField) {
            data.contractReverseSort = !data.contractReverseSort;
        } else {
            data.contractOrderByField = field;
            data.contractReverseSort = false;
        }
    };

    vm.updateApproveStatus = function (line) {
        if (!line) {
            _.forEach(data.contract.Lines, function (l) {
                vm.updateApproveStatus(l);
            });
        } else {
            if ((!!line.ReferencedQuote || data.contract.DocType !== 'ZQUO') && (!line.SICMApproval || line.SICMApproval.value !== 'P') && (!line.SISiteApproval || (line.SISiteApproval.value !== 'P' && line.SISiteApproval.value !== 'R')) && (!line.SITDApproval || (line.SITDApproval.value !== 'P' && line.SITDApproval.value !== 'R'))) {
                line.SIStatus = _.find(data.fixedVal.approveStatus, { value: 'A' });
            } else {
                line.SIStatus = _.find(data.fixedVal.approveStatus, { value: 'N' });
            }
        }
    };

    vm.updateMaterial = function (line, showWarning, populate) {
        if (!!line.Material && !!line.Material.value) {
            return getMaterialDetails(line.Material.value).then(function (material) {
                line.Material = material;
                if (showWarning && !material.MMDesc) {
                    toastr.warning('', 'Material ' + line.Material.value + ' is not valid.');
                }
                if (!!line.Material.Uoms && line.Material.Uoms.length === 1 && (!line.OrderprUn || !line.OrderprUn.uom || !_.find(line.Material.Uoms, function (u) { return u.uom.value === (line.OrderprUn && line.OrderprUn.uom && line.OrderprUn.uom.value); }))) {
                    line.OrderprUn = line.Material.Uoms[0];
                } else {
                    line.OrderprUn = _.find(line.Material.Uoms, function (u) {
                        return u.uom.value === (line.OrderprUn && line.OrderprUn.uom && line.OrderprUn.uom.value);
                    });
                }
                if (populate) {
                    vm.populateDescription(line);
                    vm.populateManufName(line);
                    vm.populateManufPart(line);
                }
                return $q.when(line);
            });
        } else {
            line.Material = {
                value: '',
                MMDesc: '',
                SlSupplierPartNum: '',
                SlSupplierName: '',
                SlInd: '',
                Plants: [],
                Uoms: []
            };
            line.OrderprUn = _.find(vm.uoms, function (u) {
                return u.uom.value === (line.OrderprUn && line.OrderprUn.uom && line.OrderprUn.uom.value);
            });
            vm.populateManufPart(line);
            return $q.when(line);
        }
    };

    vm.updateSiteString = function () {
        var tempSites = data.activeContractLine.AllSites.concat(data.activeContractLine.BadSites);
        tempSites = _.where(tempSites, { Selected: true });
        tempSites = _.sortBy(tempSites, 'site');
        data.activeContractLine.SiteString = _.pluck(tempSites, 'site').join(', ');
    };

    vm.updateUoms = function (line) {
        if (!!line && !!line.Material && !!line.Material.value) {
            return line.Material.Uoms;
        } else {
            //if (!!line && !!line.OrderprUn && !!line.OrderprUn.uom && !!line.OrderprUn.uom.value) {
            //    line.OrderprUn = _.find(vm.uoms, function (u) {
            //        return u.uom.value === (line.OrderprUn && line.OrderprUn.uom && line.OrderprUn.uom.value);
            //    });
            //}
            return vm.uoms;
        }
    };

    vm.validate = function (line) {
        vm.validating = true;
        toastr.clear();
        !!line ? null : toastr.info('', 'Validating contract...', { timeOut: 0 });
        $q.all(validate(line)).then(function (r) {
            toastr.clear();
            vm.validating = false;
        });
    };

    function addRecentContract(contract) {
        data.contractRecent.unshift(contract);
        data.contractRecent = _.uniq(data.contractRecent);
        if (data.contractRecent.length > 10) { data.contractRecent.length = 10; }
        localStorage.setItem('sombrero.contractRecent', JSON.stringify(data.contractRecent));
    }

    function arrayBufferToBase64(buffer) {
        var binary = ''
        var bytes = new Uint8Array(buffer)
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        return window.btoa(binary);
    }

    function excelDateToDateString(num) {
        if (!num) return '';
        return moment((num - 25569) * 86400000 + (moment().zone() * 60000)).format('YYYY/MM/DD');
    }

    function getContract(oa, line) {
        var headerInput = "Contract eq '" + oa + "' and TextDataFlag eq 'X'",
            itemInput = "Contract eq '" + oa + "' and TextDataFlag eq 'X' and ConditionDataFlag eq 'X'",
            extensionInput = "Contract eq '" + oa + "'";
        data.contractCheckAll = false;
        return $q.all([data.getHeader(headerInput), data.getLines(itemInput), data.getExtensions(extensionInput)]).then(function (r) {
            if (!!r[0].data) {
                $q.when(_.forEach(r[1].data, function (l) {
                    l.Material = {
                        value: l.Material
                    };
                    //getMaterialDetails(l.Material).then(function (material) {
                    //    l.Material = material;
                    //});
                    //vm.getDocument(l);
                })).then(function (response) {
                    var contract = r[0].data,
                        lines = data.mapExtensions(r[1].data, r[2].data, contract.PurchOrg);
                    contract.Lines = lines;
                    data.contract = contract;
                    if (!!line) {
                        vm.activateContractLine(_.find(data.contract.Lines, { ItemNo: line }) || _.first(data.contract.Lines));
                        //data.activeContractLine = _.find(data.contract.Lines, { ItemNo: line }) || _.first(data.contract.Lines);
                    } else {
                        vm.activateContractLine(_.first(data.contract.Lines));
                        //data.activeContractLine = _.first(data.contract.Lines);
                    }
                    data.contractReady = true;
                    addRecentContract(oa);
                    toastr.clear();
                });
            } else {
                toastr.clear();
                toastr.warning('Could not find OA ' + oa, '', { timeOut: 0 });
            }
            return r;
        }, function (r) {
            toastr.clear();
            if (r.data.hasOwnProperty('error')) {
                toastr.error(r.status + ': ' + r.data.error.message.value, '', { timeOut: 0 });
            } else {
                toastr.error('', 'An error occurred.  Status ' + r.status, { timeOut: 0 });
            }
        }).finally(function (r) {
            data.currentContractRecent = '';
            vm.gotoOa = '';
        });
    }

    function getExcelColumn(column) {
        var letter = String.fromCharCode(65 + (column % 26));
        var additional = parseInt(column / 26, 10);
        if (additional > 0) {
            return getExcelColumn(additional - 1) + letter;
        } else {
            return letter;
        }
    }

    function getMaterialDetails(materialNumber) {
        return $q.all([data.getMaterialDetails(materialNumber), data.getMaterialPlants(materialNumber), data.getMaterialUoms(materialNumber)]).then(function (r) {
            var material;
            if (!!r[0].data) {
                var sites = [];
                var uoms = [];
                _.forEach(r[1].data, function (p) {
                    sites = sites.concat(_.where(data.fixedVal.sites, { plant: p }));
                });
                _.sortBy(sites, 'site');
                _.forEach(r[2].data, function (u) {
                    uoms.push({
                        uom: _.find(data.fixedVal.uom, { value: u.UOM }) || { value: u.UOM, text: u.UOM },
                        baseAmt: u.Numerator,
                        altAmt: u.Denominator
                    })
                    //uoms.push(_.find(data.fixedVal.uom, { value: u.UOM }) || { value: u.UOM, text: u.UOM });
                });
                material = {
                    value: materialNumber,
                    MMDesc: r[0].data.MMDesc,
                    SlSupplierPartNum: r[0].data.SlSupplierPartNum,
                    SlSupplierName: r[0].data.SlSupplierName,
                    SlInd: r[0].data.SlInd,
                    SupItemSubcategoryNm: r[0].data.SupItemSubcategoryNm,
                    ElectricityUsageInd: r[0].data.ElectricityUsageInd,
                    MMBaseUom: r[0].data.MMBaseUom,
                    Sites: sites,
                    Uoms: uoms
                };
            } else {
                material = {
                    value: materialNumber,
                    MMDesc: '',
                    SlSupplierPartNum: '',
                    SlSupplierName: '',
                    SlInd: '',
                    SupItemSubcategoryNm: '',
                    ElectricityUsageInd: '',
                    MMBaseUom: '',
                    Sites: [],
                    Uoms: []
                };
            }
            return $q.when(material);
        });
    };

    function importLines(lines, filename) {
        var warnings = false;
        _.forEach(lines, function (line) {
            var existingLine, l, sites;
            _.forEach(data.fixedVal.oaXlsx, function (f) {
                line[f.value] = typeof line[f.text] === 'string' ? line[f.text].trim() : line[f.text] || '';
            });
            existingLine = _.find(data.contract.Lines, { ItemNo: parseInt(line.ItemNo, 10) });
            l = !!existingLine ? existingLine : {
                NewLine: true,
                BadSites: [],
                OriginalSites: [],
                Sites: [],
                SiteString: ''
            };
            if (!existingLine) {
                l.ItemNo = nextNumber();
                data.contract.Lines.push(l);
            }
            l.Selected = true;
            l.Warnings = [];
            //OA Number
            l.Contract = data.contract.Contract;
            if ((line.Contract || '').toString().trim() !== (data.contract.Contract || '').toString().trim()) {
                l.Warnings.push('OA Number does not match. Please double-check data.');
            }
            //Line Number
            if (!!line.ItemNo && !existingLine) {
                l.Warnings.push('Line Number does not exist in this OA. Please double-check data. This line has been assigned the next available number. Line Number should be left blank for a new line.');
            }
            //Deletion Indicator
            if (!line.DeleteInd) {
                l.DeleteInd = '';
            } else if (line.DeleteInd.toString().trim().toUpperCase() === 'X') {
                if (l.DeleteInd !== 'X' && data.contract.PurchOrg === 'S044') { // CSI only
                    l.Warnings.push('Please ensure you have given a reason for deletion in the comments, along with the replacement contract and line if available.');
                }
                l.DeleteInd = 'X';

            } else {
                if (l.NewLine) {
                    l.Warnings.push('Deletion indicator is invalid (must be X). Line not deleted.');
                    l.DeleteInd = '';
                } else {
                    l.Warnings.push('Deletion indicator is invalid (must be X). Existing status kept.');
                }
            }
            //Line Description
            l.ShortText = !!line.ShortText ? line.ShortText.toString().trim() : '';
            //Preferred Status
            l.SIActive = _.find(data.fixedVal.preferredStatus, { value: line.SIActive.toString().trim().toUpperCase() }) || _.find(data.fixedVal.preferredStatus, function (s) { return s.text.toUpperCase() === line.SIActive.toString().trim().toUpperCase() }) || (!!line.SIActive.toString().trim() ? { value: line.SIActive.toString().trim().toUpperCase(), text: line.SIActive.toString().trim().toUpperCase() } : '');
            //CM Approval
            l.SICMApproval = _.find(data.fixedVal.cmStatus, { value: line.SICMApproval.toString().trim().toUpperCase() }) || _.find(data.fixedVal.cmStatus, function (s) { return s.text.toUpperCase() === line.SICMApproval.toString().trim().toUpperCase() }) || (!!line.SICMApproval.toString().trim() ? { value: line.SICMApproval.toString().trim().toUpperCase(), text: line.SICMApproval.toString().trim().toUpperCase() } : '');
            //Site Approval
            l.SISiteApproval = _.find(data.fixedVal.siteStatus, { value: line.SISiteApproval.toString().trim().toUpperCase() }) || _.find(data.fixedVal.siteStatus, function (s) { return s.text.toUpperCase() === line.SISiteApproval.toString().trim().toUpperCase() }) || (!!line.SISiteApproval.toString().trim() ? { value: line.SISiteApproval.toString().trim().toUpperCase(), text: line.SISiteApproval.toString().trim().toUpperCase() } : '');
            //TD Approval
            l.SITDApproval = _.find(data.fixedVal.tdStatus, { value: line.SITDApproval.toString().trim().toUpperCase() }) || _.find(data.fixedVal.tdStatus, function (s) { return s.text.toUpperCase() === line.SITDApproval.toString().trim().toUpperCase() }) || (!!line.SITDApproval.toString().trim() ? { value: line.SITDApproval.toString().trim().toUpperCase(), text: line.SITDApproval.toString().trim().toUpperCase() } : '');
            //Update Approve Status
            vm.updateApproveStatus(l);
            //Line Start Date
            if (!!line.ConditionStart) {
                if (typeof line.ConditionStart === 'string') {
                    l.ConditionStart = moment(line.ConditionStart).isValid() ? moment(line.ConditionStart).format('YYYY-MM-DD') : '';
                } else if (typeof line.ConditionStart === 'number') {
                    l.ConditionStart = excelDateToDateString(line.ConditionStart) === 'Invalid date' ? '' : excelDateToDateString(line.ConditionStart);
                } else {
                    l.ConditionStart = '';
                }
            } else {
                l.ConditionStart = moment().format("MM/DD/YYYY");
            }
            //Line End Date
            if (!!line.ConditionEnd) {
                if (typeof line.ConditionEnd === 'string') {
                    l.ConditionEnd = moment(line.ConditionEnd).isValid() ? moment(line.ConditionEnd).format('YYYY-MM-DD') : '';
                } else if (typeof line.ConditionStart === 'number') {
                    l.ConditionEnd = excelDateToDateString(line.ConditionEnd) === 'Invalid date' ? '' : excelDateToDateString(line.ConditionEnd);
                } else {
                    l.ConditionEnd = '';
                }
            } else {
                l.ConditionEnd = '12/31/9999';
            }
            //Linked Quote and Referenced Quote
            if ((l.QuoteDIR && l.QuoteDIR.toString().trim().toUpperCase()) !== line.QuoteDIR.toString().trim().toUpperCase()) {
                l.QuoteDIR = !!line.QuoteDIR ? line.QuoteDIR.toString().trim() : '';
                l.ReferencedQuote = '';
            }
            //Supplier Part Number
            l.VendMat = !!line.VendMat ? line.VendMat.toString().trim() : '';
            //Unforecasted LT
            l.PlanDel = !!line.PlanDel ? line.PlanDel.toString().trim() : '';
            //Price
            l.NetPrice = !!line.NetPrice ? line.NetPrice.toString().trim() : '';
            //IncoTerms1
            l.Incoterms1 = _.find(data.fixedVal.incoTerms, { value: line.Incoterms1.toString().trim().toUpperCase() }) || _.find(data.fixedVal.incoTerms, function (s) { return s.text.toUpperCase() === line.Incoterms1.toString().trim().toUpperCase() }) || { value: line.Incoterms1.toString().trim().toUpperCase(), text: line.Incoterms1.toString().trim().toUpperCase() };
            //IncoTerms2
            l.Incoterms2 = !!line.Incoterms2 ? line.Incoterms2.toString().trim() : l.Incoterms1.inco2 || ''; //Default to inco2
            //Shipping Instructions
            l.Shipping = _.find(data.fixedVal.shipInst, { value: line.Shipping.toString().trim().toUpperCase() }) || _.find(data.fixedVal.shipInst, function (s) { return s.text.toUpperCase() === line.Shipping.toString().trim().toUpperCase() }) || !!(line.Shipping.toString().trim().toUpperCase()) ? { value: line.Shipping.toString().trim().toUpperCase(), text: line.Shipping.toString().trim().toUpperCase() } : ((l.NewLine ? _.find(data.fixedVal.shipInst, { default: 'true' }) : ''));
            //Manufacturer Name
            l.SIMfrnr = !!line.SIMfrnr ? line.SIMfrnr.toString().trim() : '';
            //Manufacturer Part Number
            l.SIMfrpn = !!line.SIMfrpn ? line.SIMfrpn.toString().trim() : '';
            //Supplier Diff Justification
            if (typeof line.SISupplierDiffJustif === 'string') {
                l.SISupplierDiffJustif = _.find(data.fixedVal.supplierDifference, function (s) { return s.toUpperCase() === line.SISupplierDiffJustif.toString().trim().toUpperCase() }) || line.SISupplierDiffJustif.toString().trim() || '';
            } else if (typeof line.SISupplierDiffJustif === 'number') {
                l.SISupplierDiffJustif = data.fixedVal.supplierDifference[line.SISupplierDiffJustif] || 'Invalid';
            } else {
                l.SISupplierDiffJustif = 'Invalid';
            }
            //Model Diff Justification
            if (typeof line.SIModelDiffJustif === 'string') {
                l.SIModelDiffJustif = _.find(data.fixedVal.supplierDifference, function (s) { return s.toUpperCase() === line.SIModelDiffJustif.toString().trim().toUpperCase() }) || line.SIModelDiffJustif.toString().trim() || '';
            } else if (typeof line.SIModelDiffJustif === 'number') {
                l.SIModelDiffJustif = data.fixedVal.supplierDifference[line.SIModelDiffJustif] || 'Invalid';
            } else {
                l.SIModelDiffJustif = 'Invalid';
            }
            //Supplier Diff Justification Comment
            l.SISupplierDiffComment = !!line.SISupplierDiffComment ? line.SISupplierDiffComment.toString().trim() : '';
            //Model Diff Justification Comment
            l.SIModelDiffComment = !!line.SIModelDiffComment ? line.SIModelDiffComment.toString().trim() : '';
            //Forecast LT
            l.SIFcstLt = !!line.SIFcstLt ? line.SIFcstLt.toString().trim() : l.PlanDel || ''; //Default to Unforecasted LT
            //Forecast Notice
            l.SIFcstNotice = !!line.SIFcstNotice ? line.SIFcstNotice.toString().trim() : '';
            //Expiration Notice
            l.SIITMRequotingTime = !!line.SIITMRequotingTime ? line.SIITMRequotingTime.toString().trim() : '';
            if (data.contract.PurchOrg === 'S044' && !l.SIITMRequotingTime) { l.SIITMRequotingTime = '7'; } //Default to 7 for CSI
            //CE Marking
            l.SICeMarking = _.find(data.fixedVal.ceMarking, { value: line.SICeMarking.toString().trim().toUpperCase() }) || _.find(data.fixedVal.ceMarking, function (s) { return s.text.toUpperCase() === line.SICeMarking.toString().trim().toUpperCase() }) || { value: line.SICeMarking.toString().trim().toUpperCase(), text: line.SICeMarking.toString().trim().toUpperCase() };
            //Min Order Qty
            l.SIMinOrderQty = !!line.SIMinOrderQty ? line.SIMinOrderQty.toString().trim() : '';
            //Comment
            l.NoteLongText = !!line.NoteLongText ? line.NoteLongText.toString().trim() : '';
            //Sites
            l.AllSites = _.clone(_.where(data.fixedVal.sites, { parentPOrg: data.contract.PurchOrg }).length > 0 ? _.where(data.fixedVal.sites, { parentPOrg: data.contract.PurchOrg }) : _.where(data.fixedVal.sites, { pOrg: data.contract.PurchOrg }), true);
            _.forEach(l.AllSites, function (s) {
                s.ShippingCondition = _.find(data.fixedVal.shipCond, { default: 'true' }) || { value: '', text: '', transitTime: '' };
                s.Selected = false;
                if (!!line[s.site] && !!line[s.site].toString().trim()) {
                    s.ShippingCondition = _.find(data.fixedVal.shipCond, { value: line[s.site].toString().trim().toUpperCase() }) || _.find(data.fixedVal.shipCond, function (c) { return c.text.toUpperCase() === line[s.site].toString().trim().toUpperCase() }) || { value: line[s.site].toString().trim().toUpperCase() };
                    s.Selected = true;
                }
            });
            l.SiteString = _.pluck(_.sortBy(_.where(l.AllSites.concat(l.BadSites), { Selected: true }), 'site'), 'site').join(', ');
            //MM Number
            if (!l.NewLine) {
                if (l.Material.value.toString().trim() !== line.Material.toString().trim()) {
                    l.Warnings.push('MM Number cannot be changed on an existing line.');
                }
            } else {
                l.Material = { value: line.Material || '' };
                if (!!l.Material.value) {
                    vm.updateMaterial(l, false, true);
                }
            }
            //UOM
            if (!l.NewLine) {
                if (l.OrderprUn.uom.value.toString().trim() !== line.OrderprUn.toString().trim()) {
                    l.Warnings.push('Unit of Measure cannot be changed on an existing line.');
                }
            } else {
                l.OrderprUn = {
                    uom: _.find(data.fixedVal.uom, { value: line.OrderprUn.toString().trim().toUpperCase() }) || _.find(data.fixedVal.uom, function (u) { return u.text.toUpperCase() === line.OrderprUn.toString().trim().toUpperCase() }) || { value: line.OrderprUn.toString().trim().toUpperCase() || '' }
                };
            }

            if (l.Warnings.length > 0) {
                l.Selected = false;
                warnings = true;
            }
        });

        toastr.clear();
        if (warnings) {
            toastr.warning('Please check the data before saving.', filename + ' imported with some issues.', { timeOut: 0 });
        } else {
            toastr.success('', filename + ' imported successfully!', { timeOut: 8000 });
        }
    }

    function nextNumber() {
        var maxNumber = _.max(data.contract.Lines, function (l) {
            return l.ItemNo;
        });

        var startNumber = parseInt(maxNumber.ItemNo, 10) + 1;
        for (var i = startNumber; true ; i++) {
            if (i % parseInt(data.fixedVal.defaults.lineIncrement, 10) === 0) {
                return i;
            }
        }
    }

    function s2ab(s) {
        var buf = new ArrayBuffer(s.length);
        var view = new Uint8Array(buf);
        for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
    }

    function validate (line, linePromises) {
        if (!linePromises) {
            linePromises = [];
        }
        if (!line) {
            data.contract.errors = [];
            // ****** Validate header data ****** //
            // *** System Validations *** //
            //OA Type
            if (!_.find(data.fixedVal.oaType, { value: data.contract.DocType })) {
                data.contract.errors.push('OA Type is invalid.');
            }
            //POrg
            if (!_.find(data.fixedVal.purchOrg, { value: data.contract.PurchOrg })) {
                data.contract.errors.push('POrg is invalid.');
            }
            //Supplier
            if (!data.contract.Vendor || !/^\d{10}$/.test(data.contract.Vendor.toString().trim())) {
                data.contract.errors.push('Supplier ID must be a 10-digit number.');
            }
            //Currency
            if (!_.find(data.fixedVal.currency, { value: data.contract.Currency && data.contract.Currency.value })) {
                data.contract.errors.push('Currency is invalid.');
            }
            //Header Dates
            if (!data.contract.VperStart || !moment(data.contract.VperStart).isValid()) {
                data.contract.errors.push('Header Start Date is invalid.');
            }
            if (!data.contract.VperEnd || !moment(data.contract.VperEnd).isValid()) {
                data.contract.errors.push('Header End Date is invalid.');
            }
            if (moment(data.contract.VperStart).isValid() && moment(data.contract.VperEnd).isValid() && moment(data.contract.VperEnd).isBefore(moment(data.contract.VperStart), 'day')) {
                data.contract.errors.push('Header Start Date cannot be after End Date.');
            }
            if (data.contract.newContract && data.contract.VperStart && moment(data.contract.VperStart).isValid() && data.contract.VperEnd && moment(data.contract.VperEnd).isValid() && (moment(data.contract.VperEnd).isBefore(moment(), 'day') || moment(data.contract.VperStart).isAfter(moment(), 'day'))) {
                data.contract.errors.push('Header Dates must be valid as of today for a new contract.');
            }
            //Contract Number
            if (data.contract.ReferencedContract && !data.validChars.test(data.contract.ReferencedContract.toString().trim())) {
                data.contract.errors.push('Contract Number has invalid characters. Only alphanumeric, space, and !"%&\'()*+,-./:;<=>?_ are valid.');
            }
            if (data.contract.ReferencedContract && data.contract.ReferencedContract.toString().trim().length > 132) {
                data.contract.errors.push('Contract Number is over 132 characters.');
            }
            //CM
            if (!data.contract.PurGroup || !_.find(data.purGroup, { value: data.contract.PurGroup && data.contract.PurGroup.value })) {
                data.contract.errors.push('CM is invalid.');
            }
            //CCM
            if (!data.contract.HdrBuyerField || !_.find(data.purGroup, { value: data.contract.HdrBuyerField && data.contract.HdrBuyerField.value })) {
                data.contract.errors.push('CCM is invalid.');
            }
            //IncoTerms1
            if (!_.find(data.fixedVal.incoTerms, { value: data.contract.Incoterms1 && data.contract.Incoterms1.value })) {
                data.contract.errors.push('IncoTerms are invalid.');
            }
            //IncoTerms2
            if (data.contract.Incoterms2 && !data.validChars.test(data.contract.Incoterms2.toString().trim())) {
                data.contract.errors.push('IncoTerms Location has invalid characters. Only alphanumeric, space, and !"%&\'()*+,-./:;<=>?_ are valid.');
            }
            if (data.contract.Incoterms2 && data.contract.Incoterms2.toString().trim().length > 28) {
                data.contract.errors.push('IncoTerms Location is over 28 characters.');
            }
            //Payment Terms
            if (!_.find(data.fixedVal.paymentTerms, { value: data.contract.Pmnttrms && data.contract.Pmnttrms.value })) {
                data.contract.errors.push('Payment Terms are invalid.');
            }
            //Supplier Contact
            if (data.contract.SalesPers && !data.validChars.test(data.contract.SalesPers.toString().trim())) {
                data.contract.errors.push('Supplier Contact has invalid characters. Only alphanumeric, space, and !"%&\'()*+,-./:;<=>?_ are valid.');
            }
            if (data.contract.SalesPers && data.contract.SalesPers.toString().trim().length > 30) {
                data.contract.errors.push('Supplier Contact is over 30 characters.');
            }
            //Supplier Telephone
            if (data.contract.Telephone && !data.validChars.test(data.contract.Telephone.toString().trim())) {
                data.contract.errors.push('Supplier Telephone has invalid characters. Only alphanumeric, space, and !"%&\'()*+,-./:;<=>?_ are valid.');
            }
            if (data.contract.Telephone && data.contract.Telephone.toString().trim().length > 16) {
                data.contract.errors.push('Supplier Telephone is over 16 characters.');
            }

            // *** Business Validations *** //
            //Contract Number
            if (data.contract.DocType === 'ZCON' && data.contract.PurchOrg === 'S044' && !data.contract.ReferencedContract) {
                data.contract.errors.push('Contract Number is required.');
            }
            //SIRFIS Indicator
            if (!_.contains(data.fixedVal.sirfisForecast, data.contract.HdrSirfisFcst)) {
                data.contract.errors.push('SIRFIS Indicator is invalid.');
            }

            // Check each line
            _.forEach(data.contract.Lines, function (l) {
                validate(l, linePromises);
            });

            // ****** Check against other OA Lines ****** //


        } else { // start of line
            var linePromise = $q.defer();
            linePromises.push(linePromise.promise);
            var promises = [];
            line.errors = [];

            // ****** System validations ****** //
            //Deletion on New Line
            if (line.NewLine && line.DeleteInd === 'X') {
                line.errors.push('A new line cannot be deleted. Uncheck the line to skip saving it.');
            }
            //Line Description
            if (!line.ShortText) {
                line.errors.push('Line Description is required.');
            }
            if (line.ShortText && !data.validChars.test(line.ShortText.toString().trim())) {
                line.errors.push('Line Description has invalid characters. Only alphanumeric, space, and !"%&\'()*+,-./:;<=>?_ are valid.');
            }
            if (line.ShortText && line.ShortText.toString().trim().length > 40) {
                line.errors.push('Line Description is over 40 characters.');
            }
            //Preferred Status
            if (!_.find(data.fixedVal.preferredStatus, { value: line.SIActive && line.SIActive.value })) {
                line.errors.push('Preferred Status is invalid.');
            }
            //CM Approval
            if (!_.find(data.fixedVal.cmStatus, { value: line.SICMApproval && line.SICMApproval.value }) && !!line.SICMApproval && !!line.SICMApproval.value) {
                line.errors.push('CM Approval is invalid.');
            }
            //Site Approval
            if (!_.find(data.fixedVal.siteStatus, { value: line.SISiteApproval && line.SISiteApproval.value }) && !!line.SISiteApproval && !!line.SISiteApproval.value) {
                line.errors.push('Site Approval is invalid.');
            }
            //TD Approval
            if (!_.find(data.fixedVal.tdStatus, { value: line.SITDApproval && line.SITDApproval.value }) && !!line.SITDApproval && !!line.SITDApproval.value) {
                line.errors.push('TD Approval is invalid.');
            }
            //Update Approve Status
            vm.updateApproveStatus(line);
            //Line Dates
            if (!line.ConditionStart || !moment(line.ConditionStart).isValid()) {
                line.errors.push('Line Start Date is invalid.');
            }
            if (!line.ConditionEnd || !moment(line.ConditionEnd).isValid()) {
                line.errors.push('Line End Date is invalid.');
            }
            if (moment(line.ConditionStart).isValid() && moment(line.ConditionEnd).isValid() && moment(line.ConditionEnd).isBefore(moment(line.ConditionStart), 'day')) {
                line.errors.push('Line Start Date cannot be after End Date.');
            }
            if (line.NewLine && line.ConditionStart && moment(line.ConditionStart).isValid() && line.ConditionEnd && moment(line.ConditionEnd).isValid() && (moment(line.ConditionEnd).isBefore(moment(), 'day') || moment(line.ConditionStart).isAfter(moment(), 'day'))) {
                line.errors.push('Line Dates must be valid as of today for a new line.');
            }
            //Linked Quote and Referenced Quote
            if (!!line.QuoteDIR) {
                var deferQuote = $q.defer();
                promises.push(deferQuote.promise);
                vm.getDocument(line).then(function (l) {
                    if (l.datesOverwritten) {
                        line.errors.push('Line start/end dates have been overwritten from the Quote Document.');
                    }
                }, function (r) {
                    line.QuoteDIR = '';
                    line.ReferencedQuote = '';
                    line.errors.push('Quote document does not exist.');
                }).finally(function (r) {
                    deferQuote.resolve();
                });
            } else {
                line.QuoteDIR = '';
                line.ReferencedQuote = '';
            }
            //Supplier Part Number
            //if (line.VendMat && !data.validChars.test(line.VendMat.toString().trim())) {
            //    line.errors.push('Supplier Part Number has invalid characters. Only alphanumeric, space, and !"%&\'()*+,-./:;<=>?_ are valid.');
            //}
            if (line.VendMat && line.VendMat.toString().trim().length > 35) {
                line.errors.push('Supplier Part Number is over 35 characters.');
            }
            //Unfcst LT
            if (!line.PlanDel) {
                line.errors.push('Unfcst LT is required.')
            }
            if (line.PlanDel && !/^\d{1,3}$/.test(line.PlanDel.toString().trim())) {
                line.errors.push('Unfcst LT must be a number between 0 and 999.');
            }
            //Price
            if (!line.NetPrice || line.NetPrice === 0 || line.NetPrice === '' || line.NetPrice === '0') {
                line.errors.push('Price cannot be left blank and must be greater than 0.');
            } else {
                line.NetPrice = line.NetPrice && line.NetPrice.toString().replace(/[\$,]/g, '');
                if (!/^\d*\.?\d*$/.test(line.NetPrice)) {
                    line.errors.push('Price is invalid. It must contain only numbers and a decimal.');
                }
            }
            //IncoTerms1
            if (!_.find(data.fixedVal.incoTerms, { value: line.Incoterms1 && line.Incoterms1.value }) && !!line.Incoterms1 && !!line.Incoterms1.value) {
                line.errors.push('IncoTerms are invalid.');
            }
            //IncoTerms2
            if (line.Incoterms2 && !data.validChars.test(line.Incoterms2.toString().trim())) {
                line.errors.push('IncoTerms Location has invalid characters. Only alphanumeric, space, and !"%&\'()*+,-./:;<=>?_ are valid.');
            }
            if (line.Incoterms2 && line.Incoterms2.toString().trim().length > 28) {
                line.errors.push('IncoTerms Location is over 28 characters.');
            }
            //Shipping Instructions
            if (!_.find(data.fixedVal.shipInst, { value: line.Shipping && line.Shipping.value }) && !!line.Shipping && !!line.Shipping.value) {
                line.errors.push('Shipping Instructions are invalid.');
            }
            //Manufacturer Name
            if (line.SIMfrnr && !data.validChars.test(line.SIMfrnr.toString().trim())) {
                line.errors.push('Manufacturer Name has invalid characters. Only alphanumeric, space, and !"%&\'()*+,-./:;<=>?_ are valid.');
            }
            if (line.SIMfrnr && line.SIMfrnr.toString().trim().length > 35) {
                line.errors.push('Manufacturer Name is over 35 characters.');
            }
            //Manufacturer Part Number
            if (line.SIMfrpn && !data.validChars.test(line.SIMfrpn.toString().trim())) {
                line.errors.push('Manufacturer Part Number has invalid characters. Only alphanumeric, space, and !"%&\'()*+,-./:;<=>?_ are valid.');
            }
            if (line.SIMfrpn && line.SIMfrpn.toString().trim().length > 35) {
                line.errors.push('Manufacturer Part Number is over 35 characters.');
            }
            //Supplier Diff Justification
            if (!_.contains(data.fixedVal.supplierDifference, line.SISupplierDiffJustif) && !!line.SISupplierDiffJustif) {
                line.errors.push('Supplier Difference Justification is invalid.');
            }
            //Model Diff Justification
            if (!_.contains(data.fixedVal.modelDifference, line.SIModelDiffJustif) && !!line.SIModelDiffJustif) {
                line.errors.push('Model Difference Justification is invalid.');
            }
            //Supplier Diff Justification Comment
            if (line.SISupplierDiffComment && !data.validChars.test(line.SISupplierDiffComment.toString().trim())) {
                line.errors.push('Supplier Diff Justification Comment has invalid characters. Only alphanumeric, space, and !"%&\'()*+,-./:;<=>?_ are valid.');
            }
            if (line.SISupplierDiffComment && line.SISupplierDiffComment.toString().trim().length > 255) {
                line.errors.push('Supplier Diff Justification Comment is over 255 characters.');
            }
            //Model Diff Justification Comment
            if (line.SIModelDiffComment && !data.validChars.test(line.SIModelDiffComment.toString().trim())) {
                line.errors.push('Model Diff Justification Comment has invalid characters. Only alphanumeric, space, and !"%&\'()*+,-./:;<=>?_ are valid.');
            }
            if (line.SIModelDiffComment && line.SIModelDiffComment.toString().trim().length > 255) {
                line.errors.push('Model Diff Justification Comment is over 255 characters.');
            }
            //Forecast LT
            if (line.SIFcstLt && !/^\d{1,3}$/.test(line.SIFcstLt.toString().trim())) {
                line.errors.push('Forecast LT must be a number between 0 and 999.');
            }
            //Forecast Notice
            if (line.SIFcstNotice && !/^\d{1,3}$/.test(line.SIFcstNotice.toString().trim())) {
                line.errors.push('Forecast Notice must be a number between 0 and 999.');
            }
            //CE Marking
            if (!_.find(data.fixedVal.ceMarking, { value: line.SICeMarking && line.SICeMarking.value }) && !!line.SICeMarking && !!line.SICeMarking.value) {
                line.errors.push('CE Marking is invalid.');
            }
            //Min Order Qty
            if (!!line.SIMinOrderQty && !/^\d{0,9}\.?(\.\d{0,3})?$/.test(line.SIMinOrderQty.toString().trim())) {
                line.errors.push('Minimum Order Qty is invalid. Must be numeric and can have up to 3 decimal places.');
            }
            //Comment
            if (line.NoteLongText && line.NoteLongText.toString().trim().length > 16000) {
                line.errors.push('The comment is over 16000 characters. Surely you can be more concise than that! ;-)');
            }
            //Sites
            _.forEach(_.where(line.AllSites, { Selected: true }), function (s) {
                if (!_.find(data.fixedVal.shipCond, { value: s.ShippingCondition && s.ShippingCondition.value }) && (!!s.ShippingCondition || !!s.ShippingCondition.value)) {
                    line.errors.push(s.site + ' Shipping Condition is invalid.');
                }
            });
            //MM Number
            if (line.Material && line.Material.value && !/^\d{1,10}$/.test(line.Material.value.toString().trim())) {
                line.errors.push('MM Number must be numeric with a maximum length of 10.');
            } else if (!!line.Material.value) {
                var deferMaterial = $q.defer();
                promises.push(deferMaterial.promise);
                vm.updateMaterial(line, false, true).then(function (l) {
                    if (!l.Material.MMDesc) {
                        line.errors.push("Material is not valid.");
                    }
                    //Material UOM
                    if (!_.find(l.Material.Uoms, function (u){ return u.uom.value === (l.OrderprUn && l.OrderprUn.uom && l.OrderprUn.uom.value); })) {
                        line.errors.push('Unit of Measure is invalid for this Material.');
                    }
                }).finally(function (r) {
                    deferMaterial.resolve();
                });
            } else {
                //UOM if no material
                if (!_.find(data.fixedVal.uom, { value: line.OrderprUn && line.OrderprUn.uom && line.OrderprUn.uom.value })) {
                    line.errors.push('Unit of Measure is invalid.');
                }
            }
            $q.all(promises).then(function (r) {
            }).finally(function (r) {
                linePromise.resolve();
            });

            // ****** Business Validations ****** //
            // *** CSI/PSI Validations *** //
            //Supplier Part Number
            if (!line.VendMat) {
                line.errors.push('Supplier Part Number is required.');
            }
            //Manufacturer Name
            if (!line.SIMfrnr) {
                line.errors.push('Manufacturer Name is required.');
            }
            //Manufacturer Part Number
            if (!line.SIMfrpn) {
                line.errors.push('Manufacturer Part Number is required.');
            }

            // *** CSI Validations *** //
            if (data.contract.PurchOrg == 'S044') {
                //Supplier Diff Justification
                if (line.Material.SlInd && line.Material.SlInd.toString().trim() === '1' && !line.SISupplierDiffJustif && line.Material.SlSupplierName && line.SIMfrnr.toString().trim().toUpperCase() !== line.Material.SlSupplierName.toString().trim().toUpperCase()) {
                    line.errors.push('Supplier Difference Justification is required if Manufacturer Name is different than the MM Supplier Name for SL 1.');
                }
                //Model Diff Justification
                if (line.Material.SlInd && (line.Material.SlInd.toString().trim() === '1' || line.Material.SlInd.toString().trim() === '2') && !line.SIModelDiffJustif && line.Material.SlSupplierPartNum && line.SIMfrpn.toString().trim().toUpperCase() !== line.Material.SlSupplierPartNum.toString().trim().toUpperCase()) {
                    line.errors.push('Model Difference Justification is required if Manufacturer Part Number is different than the MM Supplier Part Number for SL 1 or 2.');
                }
                //Supplier Diff Justification Comment
                if (line.SISupplierDiffJustif === _.last(data.fixedVal.supplierDifference) && !line.SISupplierDiffComment) {
                    line.errors.push('Supplier Diff Justification Comment is required when "Other" is selected in the justification.');
                }
                //Model Diff Justification Comment
                if (line.SIModelDiffJustif === _.last(data.fixedVal.modelDifference) && !line.SIModelDiffComment) {
                    line.errors.push('Model Diff Justification Comment is required when "Other" is selected in the justification.');
                }
                //Forecast Notice
                if ((!line.SIFcstNotice || line.SIFcstNotice === '0') && line.PlanDel.toString().trim() !== line.SIFcstLt.toString().trim()) {
                    line.errors.push('Forecast Notice is required if Forecasted LT does not equal Unforecasted LT.');
                }
                //Expiration Notice
                if (!line.SIITMRequotingTime || line.SIITMRequotingTime === '0' || !/^\d{1,3}$/.test(line.SIITMRequotingTime.toString().trim())) {
                    line.errors.push('Expiration Notice must be a number between 1 and 999.');
                }
                //Sites
                if (!_.any(line.AllSites, { Selected: true })) {
                    line.errors.push('At least one site must be selected.');
                }
            }
        } // end of line
        return linePromises;
    }

    (function init() {
        if (!!$routeParams.oa && !!$routeParams.line && !data.editContract) {
            vm.changeContract($routeParams.oa, parseInt($routeParams.line, 10));
        } else if (!!$routeParams.oa && !data.editContract) {
            vm.changeContract($routeParams.oa);
        } else if (!!$routeParams.oa && $routeParams.oa !== data.contract.Contract && data.editContract) {
            toastr.info('Save or discard any changes first in order to retrieve a different contract.', 'Current contract is in edit mode.', { timeOut: 0 });
        }
    })();

    return vm;
}]);
///#source 1 1 /app/modules/reports.js
app.controller('reports', ['dataService', '$q', function (data, $q) {
    'use strict';
    var vm = this;
    vm.data = data;

    (function init() {

    })();

    return vm;
}]);


///#source 1 1 /app/modules/search.js
app.controller('search', ['dataService', '$q', '$filter', function (data, $q, $filter) {
    'use strict';
    var vm = this;
    vm.data = data;

    vm.activateResultsLine = function (i) {
        data.activeResultsLine = i;
    }

    vm.cleanSupplierList = function () {
        var supplierList = data.search.suppliers.match(/\d+/g);
        supplierList = _.uniq(supplierList);
        data.search.suppliers = supplierList.join('\n');
    }

    vm.clearSearch = function () {
        var reset = data.search;
        data.initializeSearch();
        data.search.processing = reset.processing;
    };

    vm.clearSite = function () {
        data.search.site = '';
    };

    vm.clearFilters = function () {
        data.resultsFilter = {};
    }

    vm.clearSettings = function () {
        localStorage.removeItem('sombrero.search');
        toastr.warning('Local settings cleared');
    };

    vm.download = function () {
        data.processing = true;
        toastr.clear();
        toastr.info('', 'Preparing download...');
        var mmNumbers = _.sortBy(_.compact(_.uniq(_.map(data.filteredResultsLines, function (l) { return l.Material; }))));
        var mmData = {};
        var promises = [];
        if (vm.includeMm) {
            _.forEach(mmNumbers, function (materialId) {
                var deferred = $q.defer();
                promises.push(deferred.promise);
                data.getMaterialDetails(materialId).then(function (r) {
                    mmData[materialId] = {};
                    if (r.data) {
                        mmData[materialId].MMDesc = r.data.MMDesc;
                        mmData[materialId].SynergyLevel = r.data.SlInd;
                        mmData[materialId].SynergyModel = r.data.SlSupplierPartNum;
                        mmData[materialId].SynergySupplier = r.data.SlSupplierName;
                        mmData[materialId].SupItemSubcategoryNm = r.data.SupItemSubcategoryNm;
                        mmData[materialId].ElectricityUsageInd = r.data.ElectricityUsageInd;
                    }
                }).finally(function () {
                    deferred.resolve();
                });
            });
        }

        $q.all(promises).then(function (r) {
        }).finally(function (r) {
            _.forEach(data.filteredResultsLines, function (l) {
                if (!!mmData[l.Material]) {
                    l.SynergyLevel = mmData[l.Material].SynergyLevel;
                    l.SupItemSubcategoryNm = mmData[l.Material].SupItemSubcategoryNm;
                    l.ElectricityUsageInd = mmData[l.Material].ElectricityUsageInd;
                }
            });
            var workbook = {},
                columnFields = data.fixedVal.searchXlsx;

            workbook.SheetNames = [];
            workbook.SheetNames[0] = 'Sheet1'; // FIX
            workbook.Sheets = {};
            workbook.Sheets[workbook.SheetNames[0]] = {};
            var sheet = workbook.Sheets[workbook.SheetNames[0]];

            //***** TODO: write comments into header fields *****//

            var colIndex = 0,
                colString = '';
            //item fields headers
            _.forEach(columnFields, function (field) {
                colString = getExcelColumn(colIndex);
                sheet[(colString + '1')] = {
                    v: field.text,
                    t: 's',
                    z: 'General'
                };
                //item fields data
                var cell;
                _.forEach(data.filteredResultsLines, function (l, j) {
                    cell = {
                        t: field.type,
                        z: field.z
                    };
                    if (!!field.filter) {
                        cell.v = $filter(field.filter)(l[field.value]);
                    } else {
                        cell.v = (typeof l[field.value] === 'object' ? l[field.value].value : l[field.value]) || '';
                    }
                    sheet[colString + (j + 2)] = cell;
                });
                colIndex++;
            });

            sheet['!ref'] = 'A1:' + getExcelColumn(colIndex - 1) + (data.filteredResultsLines.length + 1);
            var workbookOutput = XLSX.write(workbook, { bookType: 'xlsx', bookSST: false, type: 'binary' });
            saveAs(new Blob([s2ab(workbookOutput)], { type: '' }), 'OA Search ' + moment().format('YYYY.MM.DD HH.mm.ss') + '.xlsx');
            toastr.clear();

            data.processing = false;

            if (data.filteredResultsLines.length < data.contractLines.length) {
                toastr.info('', 'This data is currently filtered. Only the filtered lines have been downloaded.', { timeOut: 5000 });
            }
        });
    };

    vm.getContractLines = function () {
        if (!data.processing) {
            var itemInput = '',
                extensionInput = '';

            data.processing = true;
            data.contractLines = [];
            storeSearch();
            data.search.expanded = false;
            data.resultsFilter = {};
            data.orderByField = '';
            data.reverseSort = false;
            toastr.clear();
            toastr.info('', 'Retrieving contract data...', { timeOut: 0 });

            itemInput = (data.search.type === 'both') ? "(DocType eq 'ZCON' or DocType eq 'ZQUO')" : "DocType eq '" + encodeURIComponent(data.search.type) + "'";
            if (data.search.category !== 'all') { itemInput += " and PurchOrg eq '" + encodeURIComponent(data.search.category) + "'"; }
            if (!!data.search.contract) {
                itemInput += " and Contract eq '" + encodeURIComponent(data.search.contract) + "'";
                if (!!data.search.line) { itemInput += " and ItemNo eq '" + encodeURIComponent(data.search.line) + "'"; }
            }
            if (!!data.search.material) { itemInput += " and Material eq '" + encodeURIComponent(data.search.material) + "'"; }
            if (!!data.search.cm) { itemInput += " and PurGroup eq '" + encodeURIComponent(data.search.cm.PurGroup) + "'"; }
            if (!!data.search.suppliers) {
                var supplierList = data.search.suppliers.match(/\d+/g);
                supplierList = _.uniq(supplierList);
                data.search.suppliers = supplierList.join('\n');
                if (supplierList.length > 0) { itemInput += " and (Vendor eq '" + supplierList.join("' or Vendor eq '") + "')"; }
            }
            extensionInput = itemInput;
            itemInput += " and ConditionDataFlag eq 'X' and TextDataFlag eq 'X'";

            $q.all([data.getLines(itemInput), data.getExtensions(extensionInput)]).then(function (r) {
                r[0].data = _.filter(r[0].data, function (o) {
                    if (!!data.search.line && data.search.line !== o.ItemNo + '') { return false; }
                    if (!!data.search.material && data.search.material !== o.Material) { return false; }
                    if (!!data.search.cm && data.search.cm.PurGroup !== o.PurGroup.PurGroup) { return false; }
                    if ((data.search.type === 'ZCON' && o.DocType !== 'ZCON') ||
                        (data.search.type === 'ZQUO' && o.DocType !== 'ZQUO') ||
                        ((data.search.type === 'both' && o.DocType !== 'ZCON') &&
                        (data.search.type === 'both' && o.DocType !== 'ZQUO'))) { return false; }
                    if (data.search.category !== 'all' && data.search.category.toLowerCase() !== o.PurchOrg.value.toLowerCase()) { return false; }

                    var supplierList = data.search.suppliers.match(/\d+/g);
                    supplierList = _.uniq(supplierList);
                    if (!!data.search.suppliers && !_.contains(supplierList, o.Vendor)) { return false; }

                    if (!!data.search.mmCategory && data.search.mmCategory !== o.mmCategory) { return false; }
                    if (!!data.search.supplierPart && o.VendMat.toLowerCase().indexOf(data.search.supplierPart.toLowerCase()) === -1) { return false; }
                    if (!!data.search.description && o.ShortText.toLowerCase().indexOf(data.search.description.toLowerCase()) === -1) { return false; }
                    if (!!data.search.manuf && o.SIMfrnr.toLowerCase().indexOf(data.search.manuf.toLowerCase()) === -1) { return false; }
                    if (!!data.search.manufPart && o.SIMfrpn.toLowerCase().indexOf(data.search.manufPart.toLowerCase()) === -1) { return false; }
                    if (!!data.search.headerStatus && data.search.headerStatus !== o.HdrStatus.value) { return false; }
                    if (!!data.search.lineDeletion) {
                        if (data.search.lineDeletion === "Y" && !o.DeleteInd) { return false; }
                        if (data.search.lineDeletion === "N" && !!o.DeleteInd) { return false; }
                    }
                    if (!!data.search.preferredStatus && data.search.preferredStatus !== o.SIActive.value) { return false; }
                    if (!!data.search.approveStatus && data.search.approveStatus !== o.SIStatus.value) { return false; }
                    if (!!data.search.ccm && data.search.ccm.PurGroup !== o.HdrBuyerField.PurGroup) { return false; }
                    if (!!data.search.referencedContract && o.ReferencedContract.toLowerCase().indexOf(data.search.referencedContract.toLowerCase()) === -1) { return false; }
                    if (!!data.search.referencedQuote && o.ReferencedQuote.toLowerCase().indexOf(data.search.referencedQuote.toLowerCase()) === -1) { return false; }
                    if (data.search.oaEndType === 'from') {
                        if (!!data.search.oaDays && /^-?\d+$/.test(data.search.oaDays)) {
                            var oaDate = moment(o.VperEnd).format('MM/DD/YYYY'),
                                lineDate = moment(o.ConditionEnd).format('MM/DD/YYYY'),
                                today = moment().format('MM/DD/YYYY'),
                                searchDate = moment().add('days', data.search.oaDays).format('MM/DD/YYYY');
                            if (data.search.oaDays < 0) {
                                if (moment(oaDate).isAfter(today, 'day') || moment(oaDate).isBefore(searchDate, 'day')) { return false; }
                                if (moment(lineDate).isAfter(today, 'day') || moment(lineDate).isBefore(searchDate, 'day')) { return false; }
                            } else {
                                if (moment(oaDate).isBefore(today, 'day') || moment(oaDate).isAfter(searchDate, 'day')) { return false; }
                                if (moment(lineDate).isBefore(today, 'day') || moment(lineDate).isAfter(searchDate, 'day')) { return false; }
                            }
                        }
                    }
                    if (data.search.oaEndType === 'between') {
                        if (!!data.search.oaEnd1 && !!data.search.oaEnd2 && moment(data.search.oaEnd1).isValid() && moment(data.search.oaEnd2).isValid()) {
                            var oaDate = moment(o.VperEnd).format('MM/DD/YYYY'),
                                lineDate = moment(o.ConditionEnd).format('MM/DD/YYYY'),
                                earliest = moment(data.search.oaEnd1).format('MM/DD/YYYY'),
                                latest = moment(data.search.oaEnd2).format('MM/DD/YYYY');
                            if (moment(oaDate).isBefore(earliest, 'day') || moment(oaDate).isAfter(latest, 'day')) { return false; }
                            if (moment(lineDate).isBefore(earliest, 'day') || moment(lineDate).isAfter(latest, 'day')) { return false; }
                        }
                    }
                    return true;
                });
                var extItems = data.mapExtensions(r[0].data, r[1].data);

                if (!!data.search.site) {
                    extItems = _.filter(extItems, function (l) {
                        return _.where(l.Sites, { site: data.search.site }).length > 0;
                    });
                }
                data.contractLines = extItems;

                toastr.clear();
                if (data.contractLines.length === 0) {
                    data.search.expanded = true;
                    toastr.warning('', 'No contract lines were returned', { timeOut: 0 });
                } else {
                    toastr.success('', 'Contract data retrieved');
                }
            }, function (r) {
                toastr.clear();
                if (r.data.hasOwnProperty('error')) {
                    toastr.error(r.status + ': ' + r.data.error.message.value, '', { timeOut: 0 });
                } else {
                    toastr.error('', 'An error occurred.  Status ' + r.status, { timeOut: 0 });
                }
            }).finally(function (r) {
                data.processing = false;
            });
        }
    };

    vm.getSortClass = function (field) {
        if (data.resultsOrderByField !== field) {
            return 'fa-sort';
        } else {
            if (data.resultsReverseSort) {
                return 'fa-sort-amount-desc';
            } else {
                return 'fa-sort-amount-asc';
            }
        }
    };

    vm.sort = function (field) {
        if (field === data.resultsOrderByField) {
            data.resultsReverseSort = !data.resultsReverseSort;
        } else {
            data.resultsOrderByField = field;
            data.resultsReverseSort = false;
        }
    };

    vm.toggleSearch = function () {
        data.search.expanded = !data.search.expanded;
    };

    function getExcelColumn(column) {
        var letter = String.fromCharCode(65 + (column % 26));
        var additional = parseInt(column / 26, 10);
        if (additional > 0) {
            return getExcelColumn(additional - 1) + letter;
        } else {
            return letter;
        }
    }

    function s2ab(s) {
        var buf = new ArrayBuffer(s.length);
        var view = new Uint8Array(buf);
        for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
    }

    function storeSearch() {
        localStorage.setItem('sombrero.search', JSON.stringify(data.search));
    }

    (function init() {
    })();

    return vm;
}]);
///#source 1 1 /app/modules/settings.js
app.controller('settings', ['dataService', '$modalInstance', '$q', function (data,  $modalInstance, $q) {
    'use strict';
    var vm = this;
    vm.data = data;

    vm.close = function () {
        $modalInstance.close();
    };

    vm.updateSettings = function () {
        localStorage.setItem('sombrero.settings', JSON.stringify(data.settings));
    };

    (function init() {

    })();

    return vm;
}]);

///#source 1 1 /app/modules/supplierOwnership.js
app.controller('supplierOwnership', ['dataService', '$q', function (data, $q) {
    'use strict';
    var vm = this;
    vm.data = data;

    (function init() {

    })();

    return vm;
}]);


///#source 1 1 /app/modules/upload.js
app.controller('upload', ['dataService', '$q', '$scope', '$location', function (data, $q, $scope, $location) {
    'use strict';
    var vm = this;
    vm.data = data;
    vm.upload = {};
    vm.rABS = typeof FileReader !== "undefined" && typeof FileReader.prototype !== "undefined" && typeof FileReader.prototype.readAsBinaryString !== "undefined";

    vm.checkForecasts = function () {
        data.getForecasts(data.fixedVal.forecast[$location.host()]).then(function (r) {
            vm.retrieved = r.data;
        });
    };

    vm.drop = function (files) {
        if (files.length > 1) {
            toastr.clear();
            toastr.error('', 'Please select only one file.', { timeOut: 0 });
        } else if (files.length === 1) {
            if (files[0].type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                toastr.clear();
                toastr.error('', 'Only XLSX files can be uploaded.', { timeOut: 0 });
            } else {
                toastr.clear();
                toastr.info('', 'Importing ' + files[0].name, { timeOut: 0 });
                importFile(files[0]);
            }
        }
    };

    function arrayBufferToBase64(buffer) {
        var binary = ''
        var bytes = new Uint8Array(buffer)
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        return window.btoa(binary);
    }

    function importFile(file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var result,
                workbook,
                sheetName,
                wbJson;
            result = e.target.result;
            if (vm.rABS) {
                workbook = XLSX.read(result, { cellNF: true, cellStyles: true, type: 'binary' });
            } else {
                workbook = XLSX.read(arrayBufferToBase64(result), { cellNF: true, cellStyles: true, type: 'base64' });
            }

            sheetName = workbook.SheetNames[0];
            wbJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true });

            $scope.$apply(vm.upload = JSON.stringify(wbJson, null, 2));

            toastr.clear();
            toastr.success('', file.name + ' imported and ready for upload!');
        };
        if (vm.rABS) {
            reader.readAsBinaryString(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    }

    (function init() {

    })();

    return vm;
}]);


///#source 1 1 /app/modules/workbench.js
app.controller('workbench', ['dataService', '$q', function (data, $q) {
    'use strict';
    var vm = this;
    vm.data = data;

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

    vm.checkProdAnalyst = function () {
        return $location.host() === 'gwapps.intel.com' && (_.some(data.roles, { AgrName: 'Y_ECC_R2S_L2SUPPORT_PROD_F' }) || _.some(data.roles, { AgrName: 'Y_ANALYST_F' }));
    };

    vm.getCmCcmLink = function () {
        var link = {
            "gwappsdev.intel.com": "https://sapfi0ci.intel.com:8300/sap/bc/webdynpro/sap/ywdc_csi_cm_ccm_mapping?sap-client=250&sap-language=EN#",
            "gwappscons.intel.com": "https://sapfc0ci.intel.com:8300/sap/bc/webdynpro/sap/ywdc_csi_cm_ccm_mapping?sap-client=510&sap-language=EN#",
            "gwapps.intel.com": "https://sapfp002.intel.com:8300/sap/bc/webdynpro/sap/ywdc_csi_cm_ccm_mapping?sap-client=510&sap-language=EN#"
        };
        return link[$location.host()];
    };

    vm.getCeDeviationLink = function () {
        var link = {
            "gwappsdev.intel.com": "https://sapfi0ci.intel.com:8300/sap/bc/webdynpro/sap/ywdc_csi_ce_deviation?sap-client=250&sap-language=EN#",
            "gwappscons.intel.com": "https://sapfc0ci.intel.com:8300/sap/bc/webdynpro/sap/ywdc_csi_ce_deviation?sap-client=510&sap-language=EN#",
            "gwapps.intel.com": "https://sapfp002.intel.com:8300/sap/bc/webdynpro/sap/ywdc_csi_ce_deviation?sap-client=510&sap-language=EN#"
        };
        return link[$location.host()];
    };

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

    var serviceBase = '../../../gw/',
        headerFields = 'Contract,DocType,Vendor,VendorName,CompCode,VperStart,VperEnd,PurchOrg,PurGroup,HdrBuyerField,Incoterms1,Incoterms2,ReferencedContract,Currency,ExchRate,SalesPers,Telephone,HdrStatus,HdrReason,DocDate,Pmnttrms,CreatedBy,CreatDate,HdrChangedBy,HdrChangeDate,HdrChangeTime,HdrSirfisFcst',
        itemFields = 'Contract,DocType,Vendor,VendorName,VperStart,VperEnd,PurchOrg,PurGroup,HdrBuyerField,ItemNo,Material,ShortText,NetPrice,NetPriceUsd,PriceUnit,PoUnit,OrderprUn,PlanDel,VendMat,SIActive,SIStatus,DeleteInd,SIFcstLt,SIFcstNotice,Currency,ConditionStart,ConditionEnd,ReferencedContract,ReferencedQuote,HdrStatus,SIMfrpn,SIMfrnr,Acctasscat,Incoterms1,Incoterms2,MatlGroup,NoteLongText,Shipping,SICeMarking,SICMApproval,SIITMRequotingTime,SIMinOrderQty,SIModelDiffComment,SIModelDiffJustif,SISiteApproval,SISupplierDiffComment,SISupplierDiffJustif,SITDApproval,SIWipDate,SIWipInd,SIWipStatus,WipNoteText,SICreatedBy,SICreateDate,SIChangedBy,SIChangeDate,SIChangeTime,ScaleBaseType,QuoteDIR',
        extensionFields = 'Contract,ItemNo,Plant,StgeLoc,DeletionInd,CreatedBy,CreateDate,ChangedBy,ChangeDate,ChangeTime,ShippingCondition',
        data = {};

    data.validChars   = /^[\w!"%&'()*+,-./:;<=>? ]*$/;
    data.invalidChars = /[^\w!"%&'()*+,-./:;<=>? ]/;

    data.resultsOrderByField = 'Contract';
    data.resultsReverseSort = false;
    data.contractOrderByField = 'ItemNo';
    data.contractReverseSort = false;
    data.contractCheckAll = false;

    data.contractLines = [];
    data.contract = {};
    data.contractUnchanged = {};
    data.contractReady = false;
    data.editContract = false;
    data.token = '';
    data.contractRecent = [];
    data.settings = {};
    data.dashboard = {};
    data.dashboard.bomSite = 'D1D';
    data.dashboard.showAllForecasts = false;
    data.dashboard.showIndividualForecasts = false;

    data.getBom = function () {
        return $http.get(serviceBase + "YCAP_BOM_DETAILS_SRV/BOMDetails?$format=json&$select=MMNumber&u=" + moment()).then(function (r) {
            if (r.data.d.results.length > 0) {
                r.data = r.data.d.results;
                _.forEach(r.data, function (e) {
                    e.value = $filter('removeZeros')(e.MMNumber);
                });
            } else {
                r.data = r.data.d.results;
            }
            return r;
        });
    };

    data.getDocument = function (documentId) {
        return $http.get(serviceBase + "YCAP_DOCUMENT_DETAILS_SRV/Documents?$format=json&$filter=DocumentType eq 'ZQT' and DocumentNumber eq '" + documentId + "'&$select=Description,Statusextern,Docfile1,CreateDate,QuoteValidFrom,QuoteValidTo,QuoteSupplier&u=" + moment()).then(function (r) {
            r.data = r.data.d.results[0];
            if (r.data) {
                r.data.Filename = r.data.Docfile1.substr(r.data.Docfile1.lastIndexOf('\\') + 1);
                r.data.CreateDate = $filter('parseDate')(r.data.CreateDate);
                r.data.QuoteValidFrom = $filter('parseDate')(r.data.QuoteValidFrom);
                r.data.QuoteValidTo = $filter('parseDate')(r.data.QuoteValidTo);
            }
            return r;
        });
    };
    
    data.getExtensions = function (input) {
        return $http.get(serviceBase + "YCAP_CONTRACT_QUERY_SRV/ContractExtensions?$format=json&$filter=" + input + "&$select=" + extensionFields + "&u=" + moment(), { headers: { 'x-csrf-token': 'fetch' } }).then(function (r) {
            if (r.data.d.results.length > 0) {
                r.data = r.data.d.results;
                data.token = r.headers()['x-csrf-token'];
                _.forEach(r.data, function (e) {
                    e.ItemNo = parseInt(e.ItemNo, 10);
                    e.ShippingCondition = _.find(data.fixedVal.shipCond, { value: e.ShippingCondition }) || _.find(data.fixedVal.shipCond, { default: 'true' }) || { value: e.ShippingCondition, text: '', transitTime: '' };
                });
            } else {
                r.data = r.data.d.results;
            }
            return r;
        });
    };

    data.getForecasts = function (host) {
        if (host === 'dev') {
            return $http.get('app/services/forecasts.json').then(function (r) {
                return r;
            });
        } else {
            return $http.jsonp('https://' + host + '/Feed/CsiForecasts?callback=JSON_CALLBACK').then(function (r) {
                return r;
            });
        }
    };

    data.getHeader = function (input) {
        return $http.get(serviceBase + "YCAP_CONTRACT_QUERY_SRV/ContractHeaders?$format=json&$filter=" + input + "&$select=" + headerFields + "&u=" + moment(), { headers: { 'x-csrf-token': 'fetch' } }).then(function (r) {
            if (r.data.d.results.length > 0) {
                r.data = r.data.d.results[0];
                data.token = r.headers()['x-csrf-token'];
                r.data.CreatDate = $filter('parseDate')(r.data.CreatDate);
                r.data.DocDate = $filter('parseDate')(r.data.DocDate);
                r.data.VperStart = $filter('parseDate')(r.data.VperStart);
                r.data.VperEnd = $filter('parseDate')(r.data.VperEnd);
                r.data.HdrChangeDate = $filter('parseDate')(r.data.HdrChangeDate);
                r.data.HdrChangeTime = $filter('parseTime')(r.data.HdrChangeTime);
                r.data.ExchRate = parseFloat(r.data.ExchRate);
                r.data.ExchRate = 'JPY' ? r.data.ExchRate = r.data.ExchRate / 100 : null;
                r.data.Currency = _.find(data.fixedVal.currency, { value: r.data.Currency }) || { value: r.data.Currency, text: r.data.Currency };
                r.data.Pmnttrms = _.find(data.fixedVal.paymentTerms, { value: r.data.Pmnttrms }) || { value: r.data.Pmnttrms, text: r.data.Pmnttrms };
                r.data.Incoterms1 = _.find(data.fixedVal.incoTerms, { value: r.data.Incoterms1 }) || { value: r.data.Incoterms1, text: r.data.Incoterms1 };
                r.data.PurGroup = _.find(data.purGroup, { PurGroup: r.data.PurGroup }) || { PurGroup: r.data.PurGroup, Description: r.data.PurGroup };
                r.data.HdrBuyerField = _.find(data.purGroup, { PurGroup: r.data.HdrBuyerField }) || { PurGroup: r.data.HdrBuyerField, Description: r.data.HdrBuyerField };
            } else {
                r.data = r.data.d.results[0];
            }
            return r;
        });
    };

    data.getLines = function (input) {
        return $http.get(serviceBase + "YCAP_CONTRACT_QUERY_SRV/ContractItems?$format=json&$filter=" + input + "&$select=" + itemFields + "&u=" + moment(), { headers: { 'x-csrf-token': 'fetch' } }).then(function (r) {
            if (r.data.d.results.length > 0) {
                r.data = r.data.d.results;
                data.token = r.headers()['x-csrf-token'];
                r.data = _.sortBy(r.data, function (o) { return [o.Contract, o.ItemNo]; });
                _.forEach(r.data, function (e) {
                    e.Selected = false;
                    e.ItemNo = parseInt(e.ItemNo, 10);
                    e.DeleteInd = (e.DeleteInd === 'L' ? 'X' : '');
                    e.Material = $filter('removeZeros')(e.Material) || '';
                    e.PriceUnit = parseFloat(e.PriceUnit);
                    e.NetPrice = parseFloat(e.NetPrice);
                    e.PlanDel = parseInt(e.PlanDel, 10);
                    e.SIFcstLt = $filter('removeZeros')(e.SIFcstLt) || '';
                    e.SIFcstNotice = $filter('removeZeros')(e.SIFcstNotice) || '';
                    e.SIITMRequotingTime = $filter('removeZeros')(e.SIITMRequotingTime) || '';
                    e.ConditionStart = $filter('parseDate')(e.ConditionStart);
                    e.ConditionEnd = $filter('parseDate')(e.ConditionEnd);
                    e.VperStart = $filter('parseDate')(e.VperStart);
                    e.VperEnd = $filter('parseDate')(e.VperEnd);
                    e.SICreateDate = $filter('parseDate')(e.SICreateDate);
                    e.SIChangeDate = $filter('parseDate')(e.SIChangeDate);
                    e.SIChangeTime = $filter('parseTime')(e.SIChangeTime);
                    e.NetPriceUsd = parseFloat(e.NetPriceUsd);
                    e.SIActive = _.find(data.fixedVal.preferredStatus, { value: e.SIActive }) || { value: e.SIActive, text: e.SIActive };
                    e.SIStatus = _.find(data.fixedVal.approveStatus, { value: e.SIStatus }) || { value: e.SIStatus, text: e.SIStatus };
                    e.SICMApproval = _.find(data.fixedVal.cmStatus, { value: e.SICMApproval }) || { value: e.SICMApproval, text: e.SICMApproval };
                    e.SISiteApproval = _.find(data.fixedVal.siteStatus, { value: e.SISiteApproval }) || { value: e.SISiteApproval, text: e.SISiteApproval };
                    e.SITDApproval = _.find(data.fixedVal.tdStatus, { value: e.SITDApproval }) || { value: e.SITDApproval, text: e.SITDApproval };
                    e.Incoterms1 = _.find(data.fixedVal.incoTerms, { value: e.Incoterms1 }) || { value: e.Incoterms1, text: e.Incoterms1 };
                    e.SICeMarking = _.find(data.fixedVal.ceMarking, { value: e.SICeMarking }) || { value: e.SICeMarking, text: e.SICeMarking };
                    e.SIWipDate = $filter('parseDate')(e.SIWipDate);
                    e.HdrStatus = _.find(data.fixedVal.headerStatus, { value: e.HdrStatus }) || { value: e.HdrStatus, text: e.HdrStatus };
                    e.OrderprUn = {
                        uom: _.find(data.fixedVal.uom, { value: e.OrderprUn }) || { value: e.OrderprUn, text: e.OrderprUn }
                    };
                    e.Shipping = _.find(data.fixedVal.shipInst, { value: e.Shipping }) || { value: e.Shipping, text: e.Shipping };
                    e.PurchOrg = $filter('purchOrg')(e.PurchOrg);
                    e.PurGroup = _.find(data.purGroup, { PurGroup: e.PurGroup }) || { PurGroup: e.PurGroup, Description: e.PurGroup };
                    e.HdrBuyerField = _.find(data.purGroup, { PurGroup: e.HdrBuyerField }) || { PurGroup: e.HdrBuyerField, Description: e.HdrBuyerField };
                    e.NoteLongText = $filter('parseLongText')(e.NoteLongText);
                    e.ScaleBaseType = (!!e.ScaleBaseType ? 'X' : '');
                    e.SIMinOrderQty = parseFloat(e.SIMinOrderQty) === 0 ? '' : parseFloat(e.SIMinOrderQty) + '';
                });
            } else {
                r.data = r.data.d.results;
            }
            return r;
        });
    };

    data.getMaterialDetails = function (material) {
        return $http.get(serviceBase + "YCAP_MM_DETAILS_SRV/MMDetails?$format=json&$filter=MMNumber eq '" + material + "'&$select=MMDesc,SlSupplierPartNum,SlSupplierName,SlInd,SupItemSubcategoryNm,ElectricityUsageInd,MMBaseUom&u=" + moment()).then(function (r) {
            r.data = r.data.d.results[0];
            return r;
        });
    };

    data.getMaterialPlants = function (material) {
        return $http.get(serviceBase + "YCAP_MM_DETAILS_SRV/MMPlants?$format=json&$filter=MMNumber eq '" + material + "'&$select=Plant&u=" + moment()).then(function (r) {
            r.data = _.sortBy(_.pluck(r.data.d.results,'Plant'));
            return r;
        });
    };

    data.getMaterialUoms = function (material) {
        return $http.get(serviceBase + "YCAP_MM_DETAILS_SRV/MMAltUOMs?$format=json&$filter=MMNumber eq '" + material + "'&$select=UOM,Numerator,Denominator&u=" + moment()).then(function (r) {
            r.data = r.data.d.results;
            return r;
        });
    };

    data.getMaterialPirs = function (material) {
        return $http.get(serviceBase + "YCAP_MM_DETAILS_SRV/MMPIRs?$format=json&$filter=MMNumber eq '" + material + "'&u=" + moment()).then(function (r) {
            r.data = r.data.d.results;
            return r;
        });
    };

    data.initializeSearch = function () {
        data.search = {};
        data.search.processing = false;
        data.search.expanded = true;
        data.search.oaEndType = 'from';
        data.search.lineEndType = 'from';
        data.search.category = 'all';
        data.search.type = 'both';
        data.search.lineDeletion = '';
        data.search.preferredStatus = '';
        data.search.approveStatus = '';
        data.search.contract = '';
        data.search.line = '';
        data.search.material = '';
        data.search.cm = '';
        data.search.suppliers = '';
        data.search.site = '';
    };

    data.mapExtensions = function (items, extensions, pOrg) {
        var tempSites = [];
        //extensions = _.where(extensions, { DeletionInd: '' });
        _.forEach(items, function (o) {
            o.Sites = [];
            o.SiteString = '';
            tempSites = [];

            tempSites = _.filter(extensions, function (s) {
                return o.Contract === s.Contract && o.ItemNo === s.ItemNo;
            });
            o.OriginalSites = _.clone(tempSites, true);
            tempSites = _.where(tempSites, { DeletionInd: '' });
            _.forEach(tempSites, function (t) {
                var tempArray = [];
                if (!!t.StgeLoc) {
                    tempArray = tempArray.concat(_.clone(_.find(data.fixedVal.sites, { plant: t.Plant, sloc: t.StgeLoc }), true));
                } else {
                    tempArray = tempArray.concat(_.clone(_.where(data.fixedVal.sites, { plant: t.Plant }) || (t.Plant), true));
                }
                tempArray = _.compact(tempArray);
                if (tempArray.length > 0) {
                    _.forEach(tempArray, function (e) {
                        e.ShippingCondition = t.ShippingCondition;
                    });
                    o.Sites = o.Sites.concat(tempArray);
                }
            });
            o.Sites = _.sortBy(o.Sites, 'site');
            o.SiteString = _.pluck(o.Sites, 'site').join(', ');

            if (!!pOrg) {
                o.AllSites = [];
                o.AllSites = _.clone(_.where(data.fixedVal.sites, { parentPOrg: pOrg }).length > 0 ? _.where(data.fixedVal.sites, { parentPOrg: pOrg }) : _.where(data.fixedVal.sites, { pOrg: pOrg }), true);

                if (o.AllSites.length > 0) {
                    _.forEach(o.AllSites, function (s, i) {
                        if (_.some(o.Sites, { plant: s.plant, sloc: s.sloc })) {
                            o.AllSites[i] = _.find(o.Sites, { plant: s.plant, sloc: s.sloc });
                            o.AllSites[i].Selected = true;
                        } else {
                            o.AllSites[i].ShippingCondition = _.find(data.fixedVal.shipCond, { default: 'true' }) || { value: '', text: '', transitTime: '' };
                            o.AllSites[i].Selected = false;
                        }
                    });
                }
                o.BadSites = [];
                _.forEach(o.Sites, function (s) {
                    if (!_.find(o.AllSites, { plant: s.plant, sloc: s.sloc })) {
                        var tempObject = _.clone(s, true);
                        tempObject.Selected = true;
                        o.BadSites.push(tempObject);
                    }
                    o.BadSites = _.sortBy(o.BadSites, 'site');
                });
            }
        });
        return items;
    };

    data.fetchToken = function () {
        return $http.get(serviceBase + "YCAP_CONTRACT_QUERY_SRV/ContractHeaders?&u=" + moment(), { headers: { 'x-csrf-token': 'fetch' } }).then(function (r) {
            data.token = r.headers()['x-csrf-token'];
        });
    };

    data.size = function (obj) {
        return _.size(obj);
    };

    data.updateContract = function (data, config) {
        return $http.post(serviceBase + "YCAP_CONTRACT_MAINTAIN_SRV/ContractHeaderSet", data, config).then(function (r) {
            return r;
        });
    };

    data.uploadDocument = function (data, config) {
        return $http.post(serviceBase + "YCAP_DOCUMENT_MAINTAIN_SRV/Documents", data, config).then(function (r) {
            return r;
        });
    };

    function getCookie(name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + name + "=");
        if (parts.length == 2) {
            return parts.pop().split(";").shift().toUpperCase();
        } else {
            return '';
        }
    }

    function getFixedVals() {
        return $http.get('app/services/fixedVal.json').then(function (r) {
            data.fixedVal = r.data;
        });
    }

    function getPurGroup() {
        return $http.get(serviceBase + "YCAP_GET_PURCHASING_GROUPS_SRV/PurchaseGroups?$format=json&$select=PurGroup,Description&u=" + moment(), { headers: { 'x-csrf-token': 'fetch' } }).then(function (r) {
            data.purGroup = r.data.d.results;
            data.token = r.headers()['x-csrf-token'];
            _.forEach(data.purGroup, function (o, i) {
                data.purGroup[i] = _.omit(o, '__metadata');
                data.purGroup[i].Description = data.purGroup[i].Description.trim();
            });
        });
    }

    function getStorage() {
        var i;
        if (localStorage['sombrero.settings']) {
            data.settings = JSON.parse(localStorage.getItem('sombrero.settings'));

            i = -1;
            _.forEach(data.purGroup, function (e, index) {
                if (_.isEqual(e, data.settings.cm)) { i = index; }
            });
            data.settings.cm = (i === -1) ? '' : data.purGroup[i];
        }

        if (localStorage['sombrero.search']) {
            data.search = JSON.parse(localStorage.getItem('sombrero.search'));

            i = -1;
            _.forEach(data.purGroup, function (e, index) {
                if (_.isEqual(e, data.search.cm)) { i = index; }
            });
            data.search.cm = (i === -1) ? '' : data.purGroup[i];

            i = -1;
            _.forEach(data.purGroup, function (e, index) {
                if (_.isEqual(e, data.search.ccm)) { i = index; }
            });
            data.search.ccm = (i === -1) ? '' : data.purGroup[i];
        }

        data.contractRecent = JSON.parse(localStorage.getItem('sombrero.contractRecent')) || [];
    }

    function getSecurityRoles() {
        return $http.get(serviceBase + "YCAP_GET_SECURITY_ROLES_SRV/Roles?$format=json&$select=AgrName,Text&u=" + moment(), { headers: { 'x-csrf-token': 'fetch' } }).then(function (r) {
            data.roles = r.data.d.results;
            data.token = r.headers()['x-csrf-token'];
            data.editAllowed = false;
            if (_.some(data.roles, { AgrName: 'Y_CAP_SOURCING_ADMIN_F' }) || _.some(data.roles, { AgrName: 'Y_ECC_R2S_L2SUPPORT_PROD_F' }) || _.some(data.roles, { AgrName: 'Y_ANALYST_F' })) {
                data.editAllowed = true;
            }
        });
    }

    function getWorker() {
        return $http.get('//enterpriseservices.intel.com/SharedServices/cdisapi/v3/workers/').then(function (r) {
            if (!!r.data.WorkerInformation) {
                data.worker = r.data.WorkerInformation.Worker;
            }
            data.userId = getCookie('IDSID');
        });
    }

    data.init = function () {
        if (data.initialized) return;
        getWorker();
        return $q.all([getSecurityRoles(), getPurGroup(), getFixedVals()]).then(function () {
            data.initializeSearch();
            getStorage();
            data.initialized = true;
        }, function (r) {
            toastr.clear();
            toastr.error('', 'An error occurred on load. Please refresh.', { timeOut: 0 });
        });
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
