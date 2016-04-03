app.controller('flags', ['dataService', '$q', '$modal', '$timeout', '$filter', function (data, $q, $modal, $timeout, $filter) {
    'use strict';
    var vm = this;
    vm.data = data;

    vm.autosave = function () {
        localStorage.setItem('flags.values', JSON.stringify(data.values));
    };

    vm.donate = function (e) {
        toastr.clear();
        if (!data.values.subscribe && !data.values.donate) {
            toastr.warning('', 'You have not selected the flag service or a donation.');
            e.preventDefault();
            return;
        }
        if (!!data.values.donate && !data.values.donation) {
            toastr.warning('', 'You selected to give a donation but did not enter an amount.');
            e.preventDefault();
            return;
        }
        if (!!data.values.donation && (!_.isFinite(data.values.donation) || parseFloat(data.values.donation) < 0)) {
            toastr.warning('', "Please check your donation amount. It doesn't appear to be correct.");
            e.preventDefault();
            return;
        }
        if (data.values.subscribe && vm.getTotal() < 40) {
            toastr.error('', 'An error occurred. Please fix the data and try again.', { timeOut: 0 });
            e.preventDefault();
            return;
        }
        if (vm.getTotal() < 5) {
            toastr.warning('', '$5.00 is the minimum amount we can process through PayPal.');
            e.preventDefault();
            return;
        }
        if (!data.values.name || !(data.values.address || !data.values.subscribe)) {
            toastr.warning('', 'Please fill in all required fields.');
            e.preventDefault();
            return;
        }
        toastr.info('', 'You will now be sent to PayPal to finish the transaction.', { timeOut: 0 });
        $timeout(function () {

        }, 5000);
    };

    vm.getAmount = function () {
        var amount = 0;
        if (data.values.subscribe) {
            amount += 40;
            if (data.values.donate && data.values.donation) {
                amount += parseFloat(data.values.donation);
            }
        } else if (data.values.donate && data.values.donation) {
            amount += parseFloat(data.values.donation);
        }
        return amount;
    };

    vm.getDescription = function () {
        var desc = '';
        if (data.values.subscribe) {
            desc += '2015 Flag Subscription';
            if (data.values.donate && data.values.donation) {
                desc += ' and Donation of ' + $filter('currency')(data.values.donation, '$', 2);
            }
        } else if (data.values.donate && data.values.donation) {
            desc += 'Donation of ' + $filter('currency')(data.values.donation, '$', 2);
        }
        return desc;
    };

    vm.getDonation = function () {
        if (_.isFinite(data.values.donation)) {
            return parseFloat(data.values.donation) < 0 ? 0 : parseFloat(data.values.donation);
        } else {
            return 0;
        }
    };

    vm.getTotal = function () {
        var total = 0;
        if (data.values.subscribe) {
            total = total + 40;
        }
        if (data.values.donate) {
            total = total + vm.getDonation();
        }
        return total;
    };

    vm.showBoundaries = function () {
        toastr.clear();
        var modalInstance = $modal.open({
            templateUrl: 'app/modules/flags.boundaries.html',
            controller: 'flags.boundaries as vm',
            size: 'lg'
        });

        modalInstance.result.then(function () {
        }, function () {

        });
    };

    (function init() {
        data.values = JSON.parse(localStorage.getItem('flags.values')) || {};
    })();

    return vm;
}]);

