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

