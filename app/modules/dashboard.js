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