var app = angular.module(
    'app',
    ['ngMessages', 'ngSanitize']
).directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
}).directive('ngDrop', function () {
    return function (scope, element, attrs) {
        var result = {};
        var tmp_entires = [];

        function traverseFileTree(callback) {
            if (tmp_entires.length == 0) return callback();
            var entp = tmp_entires.splice(0, 1)[0];
            var item = entp.ent;
            var path = entp.path || "";

            if (item.isFile) {
                item.file(function (upfile) {
                    if (!result[path]) result[path] = [];
                    result[path].push(upfile);
                    traverseFileTree(callback, path);
                });
            } else if (item.isDirectory) {
                var dirReader = item.createReader();
                dirReader.readEntries(function (entries) {
                    for (var i = 0; i < entries.length; i++)
                        tmp_entires.push({ent: entries[i], path: path + item.name + "/"});
                    traverseFileTree(callback);
                });
            }
        }

        element.on("dragover", function (event) {
            event.preventDefault();
            event.stopPropagation();
            $(this).addClass('dragging');
        });

        element.on("dragleave", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });

        element.on('drop', function (event) {
            event.preventDefault();
            event.stopPropagation();
            $(this).removeClass('dragging');

            result = {};
            tmp_entires = [];

            var items = event.originalEvent.dataTransfer.items;
            for (var i = 0; i < items.length; i++) {
                var item = items[i].webkitGetAsEntry();
                if (item) tmp_entires.push({ent: item});
            }

            traverseFileTree(function () {
                var ngModel = attrs.ngDrop.split('.');
                var selected = scope;
                for (var i = 0; i < ngModel.length; i++)
                    selected = selected[ngModel[i]];
                selected(result);
            });
        });
    };
});