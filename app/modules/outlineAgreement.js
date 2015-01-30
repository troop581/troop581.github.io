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