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

