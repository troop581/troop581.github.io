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