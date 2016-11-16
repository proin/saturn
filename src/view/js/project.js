app.controller("ctrl", function ($scope, $timeout) {
    $scope.app = location.href.split('#')[1];
    $scope.appLog = [];
    $scope.singleLog = {};

    $scope.status = {};
    $scope.status.focused = -1;
    $scope.status.singleFocused = localStorage.preFocused ? localStorage.preFocused : 'libs';
    $scope.status.indent = [];
    $scope.status.logView = false;
    $scope.status.running = false;
    $scope.status.lastSaved = new Date().format('yyyy-MM-dd HH:mm:ss');

    $scope.alert = {};
    $scope.alert.message = '';
    $scope.alert.show = function (message) {
        $scope.alert.message = message;
        $('#alert').modal('show');
        $timeout();
    };

    $scope.lib = {id: 'lib', type: 'lib', value: ''};
    $scope.flowpipe = [];

    $timeout();

    $.get('http://localhost:3000/api/script/get?name=' + $scope.app, function (data) {
        if (data.err) {
            return;
        }
        $scope.lib = data.lib;
        $scope.flowpipe = data.scripts;

        $scope.event.changed();
    });

    setInterval(function () {
        var MAX_LOG_SIZE = 100;
        $.get('http://localhost:3000/api/script/log?name=' + $scope.app, function (data) {
            if (!$scope.singleLog[$scope.status.singleFocused]) $scope.singleLog[$scope.status.singleFocused] = [];
            for (var i = 0; i < data.data.length; i++) {
                if (data.data[i].status == 'start') {
                    // $scope.appLog.splice(0);
                    if ($scope.singleLog[$scope.status.focused])
                        $scope.singleLog[$scope.status.focused].splice(0);
                } else if (data.data[i].status == 'data' && $scope.status.singleFocused !== -1) {
                    $scope.singleLog[$scope.status.singleFocused].push(data.data[i]);
                    if ($scope.singleLog[$scope.status.singleFocused].length > MAX_LOG_SIZE)
                        $scope.singleLog[$scope.status.singleFocused].splice(0, $scope.singleLog[$scope.status.singleFocused].length - MAX_LOG_SIZE);
                }
            }

            $scope.status.running = data.running;
            $timeout(function () {
                $('.code-container.running .output').scrollTop($('#terminal .action').height() + 200);
            });
        });
    }, 1000);

    var codemirror = function (_id) {
        var creator = function (id) {
            var fidx = $scope.event.findIndex(id.replace('code-editor-', ''));
            var value = '';
            if (id == 'code-editor-libs') {
                $scope.lib.value = $scope.lib.value ? $scope.lib.value : "// load npm libraries\nconst fs = require('fs');";
                value = $scope.lib.value;
            } else {
                value = $scope.flowpipe[fidx].value;
            }

            $('#' + id).html('');

            var OsNo = navigator.userAgent.toLowerCase();
            var os = {
                Linux: /linux/.test(OsNo),
                Unix: /x11/.test(OsNo),
                Mac: /mac/.test(OsNo),
                Windows: /win/.test(OsNo)
            };
            var cmdkey = 'Ctrl';
            if (os.Mac) cmdkey = 'Cmd';
            var keymap = {};
            keymap[cmdkey + '-F'] = function (cm) {
                cm.foldCode(cm.getCursor());
            };
            keymap[cmdkey + '-R'] = function () {
                $scope.click.run();
            };
            keymap[cmdkey + '-S'] = function () {
                $scope.click.save(true);
            };

            CodeMirror(document.getElementById(id), {
                height: 'auto',
                value: value,
                lineNumbers: true,
                lineWrapping: true,
                extraKeys: keymap,
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                viewportMargin: Infinity,
                mode: "javascript"
            }).on('change', function (e) {
                var changeValue = e.getValue();
                if (id == 'code-editor-libs') $scope.lib.value = changeValue;
                else $scope.flowpipe[fidx].value = changeValue;
            });
        };

        if (_id) {
            creator(_id);
            return;
        }

        $('.code-editor').each(function () {
            var id = $(this).attr('id');
            creator(id);
        });
    };

    var findInfluence = function (idx) {
        var indexing = {};
        var max = idx;
        for (var i = idx; i >= 0; i--)
            if ($scope.flowpipe[i].type == 'loop')
                if ($scope.flowpipe[i].block_end * 1 >= idx)
                    max = $scope.flowpipe[i].block_end * 1;

        for (var i = max; i >= 0; i--)
            if ($scope.flowpipe[i].type == 'loop')
                if ($scope.flowpipe[i].block_end * 1 >= idx)
                    indexing[i] = true;

        if (idx > -1)
            for (var i = idx + 1; i < $scope.flowpipe.length; i++)
                if ($scope.flowpipe[i].type == 'loop')
                    indexing[i] = true;

        var result = [];
        for (var key in indexing)
            result.push(key);

        return result;
    };

    var findRoot = function (idx) {
        var indexing = {};
        var max = idx;
        for (var i = idx; i >= 0; i--)
            if ($scope.flowpipe[i] && $scope.flowpipe[i].type == 'loop')
                if ($scope.flowpipe[i].block_end * 1 > idx)
                    max = $scope.flowpipe[i].block_end * 1;
        for (var i = max; i >= 0; i--)
            if ($scope.flowpipe[i] && $scope.flowpipe[i].type == 'loop')
                if ($scope.flowpipe[i].block_end * 1 > idx)
                    indexing[i] = true;

        var result = [];
        for (var key in indexing)
            result.push(key);

        return result[0] * 1 ? result[0] * 1 : idx;
    };

    var idCreator = function () {
        return Math.round(Math.random() * 100) + '-' + new Date().getTime();
    };

    $scope.event = {};

    $scope.event.findIndex = function (id) {
        for (var i = 0; i < $scope.flowpipe.length; i++)
            if ($scope.flowpipe[i].id == id)
                return i;
        return null;
    };

    $scope.event.indent = function () {
        $scope.status.indent = [];

        var block_indent = 0;
        var block_end = [];
        for (var i = 0; i < $scope.flowpipe.length; i++) {
            if ($scope.flowpipe[i].type == 'loop') {
                block_end.unshift($scope.flowpipe[i].block_end * 1);
                $scope.status.indent.push(block_indent);
                block_indent++;
                continue;
            }

            var unindented = false;
            for (var j = 0; j < block_end.length; j++) {
                if (block_end[j] == i) {
                    if (unindented === false) {
                        $scope.status.indent.push(block_indent);
                        unindented = true;
                    }

                    block_indent--;
                    block_end.splice(0, 1);
                    j--;
                }
            }

            if (unindented == false)
                $scope.status.indent.push(block_indent);
        }
    };

    $scope.event.changed = function () {
        $scope.worklist();
        $timeout(function () {
            $scope.event.indent();
            codemirror();
        });
    };

    $scope.click = {};
    $scope.click.codebox = function (idx) {
        $scope.status.focused = idx;
        $timeout();
    };

    $scope.click.remove = function () {
        if ($scope.status.focused == -1) return $scope.alert.show('[libs] is not removable');
        if ($scope.flowpipe[$scope.status.focused].type == 'loop') return $scope.alert.show('[loop] is not removable');

        var indexing = findInfluence($scope.status.focused);

        for (var i = 0; i < indexing.length; i++)
            if ($scope.flowpipe[indexing[i]].type == 'loop')
                $scope.flowpipe[indexing[i]].block_end = ($scope.flowpipe[indexing[i]].block_end * 1 - 1) + '';

        $scope.flowpipe.splice($scope.status.focused * 1, 1);
        $scope.status.focused--;

        $scope.event.changed();
    };

    $scope.click.add = function () {
        var indexing = [];
        if ($scope.flowpipe.length > 0) indexing = findInfluence($scope.status.focused == -1 ? 0 : $scope.status.focused);

        for (var i = 0; i < indexing.length; i++)
            if ($scope.flowpipe[indexing[i]].type == 'loop')
                $scope.flowpipe[indexing[i]].block_end = ($scope.flowpipe[indexing[i]].block_end * 1 + 1) + '';

        if ($scope.status.focused == -1) {
            $scope.flowpipe.splice(0, 0, {id: idCreator(), type: 'work', value: ''})
        } else {
            $scope.flowpipe.splice($scope.status.focused * 1 + 1, 0, {id: idCreator(), type: 'work', value: ''})
        }

        $scope.event.changed();
    };

    $scope.click.clean = function () {
        $scope.singleLog = {};
        $timeout();
        // $.get('/api/script/log-clear?name=' + $scope.app);
    };

    $scope.click.save = function (isNotShow) {
        var runnable = {name: $scope.app, lib: JSON.stringify($scope.lib), scripts: JSON.stringify($scope.flowpipe)};
        $.post('/api/script/save', runnable, function (result) {
            if (result.status) $scope.status.lastSaved = new Date().format('yyyy-MM-dd HH:mm:ss');
            if (result.status && !isNotShow) $scope.alert.show($scope.app + ' saved!');
            $timeout();
        });
    };

    $scope.click.log = function () {
        $scope.status.logView = !$scope.status.logView;
        $timeout();
    };

    $scope.click.run = function () {
        if ($scope.status.running) {
            $.get('/api/script/stop?name=' + $scope.app);
        } else {
            if ($scope.status.focused == -1) {
                $scope.status.singleFocused = 'libs';
            } else {
                if (!$scope.flowpipe[$scope.status.focused]) return;
                $scope.status.singleFocused = $scope.status.focused;
                if ($scope.singleLog[$scope.status.focused])
                    $scope.singleLog[$scope.status.focused].splice(0);
            }

            localStorage.preFocused = $scope.status.singleFocused;

            if ($scope.status.singleFocused === 'libs') {
                var runnable = {
                    name: $scope.app,
                    target: $scope.status.focused,
                    lib: JSON.stringify($scope.lib),
                    scripts: JSON.stringify($scope.flowpipe)
                };
                $.post('/api/script/run', runnable);
            } else {
                var runnable = {
                    name: $scope.app,
                    target: $scope.status.focused,
                    lib: JSON.stringify($scope.lib),
                    scripts: JSON.stringify($scope.flowpipe)
                };
                $.post('/api/script/run-single', runnable);
            }
        }
    };

    $scope.loogwork = {};

    $scope.worklist = function () {
        for (var k = 0; k < $scope.flowpipe.length; k++) {
            var code = $scope.flowpipe[k];
            var idx = k;
            if (code.type != 'loop') continue;

            var list = [];
            var maximum = $scope.flowpipe[findRoot(idx)].block_end;
            if (findRoot(idx) == idx)
                maximum = $scope.flowpipe.length - 1;

            for (var i = idx; i <= maximum; i++)
                if ($scope.flowpipe[i] && $scope.flowpipe[i].type == 'work')
                    list.push(i);
            if (!code.block_end) code.block_end = list[0] + '';
            $scope.loogwork[k] = list;
        }

        $timeout();
    };

    $scope.event.changed();
})
;