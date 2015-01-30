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