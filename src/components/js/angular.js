angular.module("ngTreeview", []).directive("treeModel", function ($compile) {
    return {
        restrict: "A", link: function (a, g, b) {
            let f = b.treeModel;
            let d = b.nodeLabel || "label";
            let c = b.nodeChildren || "children";
            let onSelect = b.onSelect;

            d = '<ul><li data-ng-repeat="node in ' + f + '">' +
                '<i class="fa fa-folder" data-ng-if="node.type== \'folder\' && node.collapsed" data-ng-click="' + onSelect + '(node)"></i>' +
                '<i class="fa fa-folder-open" data-ng-if="node.type == \'folder\' && !node.collapsed" data-ng-click="' + onSelect + '(node)"></i>' +
                '<i class="fa fa-code-fork" data-ng-if="node.type == \'project\'" data-ng-click="' + onSelect + '(node)"></i> ' +
                '<i class="fa fa-file-o" data-ng-if="node.type == \'file\'" data-ng-click="' + onSelect + '(node)"></i> ' +
                '<span ng-class="' +
                'status.runningLog[node.path] && PATH == node.path ? ' +
                'status.runningLog[node.path] + \' selected\' : ' +
                'PATH == node.path ? \'selected\' : ' +
                'status.runningLog[node.path] ? ' +
                'status.runningLog[node.path] : ' +
                '\'\'' +
                '" data-ng-click="' + onSelect + '(node)" context-menu data-target="menu-{{ node.path }}">{{node.name}}</span>' +

                // context menu
                '<div class="dropdown position-fixed" id="menu-{{ node.path }}"><div class="dropdown-menu" role="menu">' +
                '<a class="dropdown-item pointer" role="menuitem" data-ng-click="click.finderRight.rename(node)">rename</a>' +
                '<a class="dropdown-item pointer" role="menuitem" data-ng-click="click.finderRight.add(node)">add</a>' +
                '<a class="dropdown-item pointer" role="menuitem" data-ng-click="click.finderRight.upload(node)">upload</a>' +
                '<a class="dropdown-item pointer" role="menuitem" data-ng-click="click.finderRight.delete(node)">delete</a>' +
                '<a class="dropdown-item pointer" role="menuitem" data-ng-click="click.finderRight.download(node)">download</a>' +
                '</div></div>' +

                '<div data-ng-hide="node.collapsed" data-tree-model="node.' + c + '" data-node-id=' + (b.path || "id") + " data-node-label=" + d + " data-node-children=" + c + " data-on-select='" + onSelect + "'></div></li></ul>";

            f && f.length && (b.angularTreeview && (a.selectNode = function (a) {
                a.collapsed = !a.collapsed;
            }), g.html(null).append($compile(d)(a)))
        }
    }
});

var app = angular.module(
    'app',
    ['ngMessages', 'ngSanitize', 'ngTreeview', 'ng-context-menu']
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