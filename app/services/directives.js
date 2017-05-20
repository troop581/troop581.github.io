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
