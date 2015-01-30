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
