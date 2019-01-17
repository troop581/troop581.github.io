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
    if (data.values.donate && !data.values.donation) {
      toastr.warning('', 'You selected to give a donation but did not enter an amount.');
      e.preventDefault();
      return;
    }
    if (data.values.donation && (!_.toNumber(data.values.donation) || parseInt(data.values.donation, 10) < 0)) {
      toastr.warning('', "Please check your donation amount. It doesn't appear to be correct.");
      e.preventDefault();
      return;
    }
    if (data.values.subscribe && vm.getTotal() < data.cost) {
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

  vm.getDescription = function () {
    var desc = '';
    if (data.values.subscribe) {
      desc += data.year + ' Flag Subscription';
      if (data.values.donate && data.values.donation) {
        desc += ' and Donation of ' + $filter('currency')(data.values.donation, '$', 2);
      }
    } else if (data.values.donate && data.values.donation) {
      desc += 'Donation of ' + $filter('currency')(data.values.donation, '$', 2);
    }
    return desc;
  };

  vm.getDonation = function () {
    if (_.toNumber(data.values.donation)) {
      return parseInt(data.values.donation, 10) < 0 ? 0 : parseInt(data.values.donation, 10);
    } else {
      return 0;
    }
  };

  vm.getTotal = function () {
    var total = 0;
    if (data.values.subscribe) {
      total = total + data.cost;
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
    if (data.disabled){
      data.values = {};
    }
  })();

  return vm;
}]);

