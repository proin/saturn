app.controller("ctrl", ($scope, $timeout, API)=> {
    API.user.check().then((ACCESS_INFO)=> {
        $scope.ACCESS_STATUS = ACCESS_INFO.status;
        $scope.ACCESS_POLICY = ACCESS_INFO.policy;

        let PATH = decodeURI(location.href.split('#')[1]);
        $scope.PATH = PATH;

        $scope.ROOT_PATH = `/`;

        $scope.app = decodeURI(location.href.split('#')[1]).basename();

        // alert
        $scope.alert = {};
        $scope.alert.message = '';
        $scope.alert.show = function (message) {
            $scope.alert.message = message;
            $('#alert').modal('show');
            $timeout();
        };

        // log variables
        $scope.singleLog = {};
        $scope.chartLog = {};

        // history back
        $scope.history = function () {
            window.history.back();
        };

        // ui status
        $scope.inputLong = localStorage.inputLong ? JSON.parse(localStorage.inputLong) : {};
        $scope.outputLong = {};
        $scope.titleEdit = false;

        // variables for function
        $scope.appRename = $scope.app;

        // status
        $scope.status = {};
        $scope.status.focused = -1;
        $scope.status.singleFocused = localStorage['preFocused-' + $scope.app] ? localStorage['preFocused-' + $scope.app] : 'libs';
        $scope.status.indent = [];
        $scope.status.logView = false;
        $scope.status.running = null;
        $scope.status.runningLog = {};
        $scope.status.lastSaved = new Date().format('yyyy-MM-dd HH:mm:ss');

        // script variables
        $scope.lib = {id: 'lib', type: 'lib', value: ''};
        $scope.flowpipe = [];

        // load script data
        API.script.load(PATH).then((data)=> {
            if (data.err) return;
            $scope.lib = data.lib;
            $scope.flowpipe = data.scripts;
            $scope.event.changed();
        });

        // class: chart
        let drawChart = (target, data)=> {
            if (!$scope.chartLog[target]) $scope.chartLog[target] = {};
            $scope.chartLog[target][data.message.id] = data.message;

            if (!data.message.data.width) data.message.data.width = 300;
            if (!data.message.data.height) data.message.data.height = 300;
            if (!data.message.data.options) data.message.data.options = {};
            data.message.data.options.responsive = false;

            let render = ()=> {
                var ctx = document.getElementById('chart-' + target + '-' + data.message.id);
                if (!ctx) {
                    setTimeout(()=> {
                        render();
                    }, 100);
                    return;
                }

                Chart.defaults.global.animation.duration = 0;
                new Chart(ctx, data.message.data);
            };

            render();
        };

        // class: socket
        let socketHandler = {};

        socketHandler.status = (message)=> {
            let {type, data, name} = message;

            if (type == 'list') {
                $scope.status.runningLog = data;
                $scope.status.running = data[PATH];
            } else if (type == 'message') {
                $scope.status.runningLog[name] = data;
                if (name == PATH)
                    $scope.status.running = data;
            }

            $timeout();
        };

        socketHandler.log = (log)=> {
            let {type, data} = log;

            if (type == 'list') {
                for (let work in data) {
                    let row = [];
                    let chartOrdered = [];
                    for (let i = data[work].length - 1; i >= 0; i--) {
                        let status = data[work][i].status;
                        if (status == 'finish' || status == 'install') continue;
                        if (status == 'start') break;
                        if (status == 'chart') {
                            data[work][i].message = JSON.parse(data[work][i].message);
                            chartOrdered.unshift({name: work, data: data[work][i]});
                            continue;
                        }

                        row.unshift(data[work][i]);
                    }

                    for (let i = 0; i < chartOrdered.length; i++)
                        drawChart(chartOrdered[i].name, chartOrdered[i].data);

                    data[work] = row;
                }

                $scope.singleLog = data;
            } else if (type == 'message') {
                let {status, target} = data;

                if (!$scope.singleLog[target])
                    $scope.singleLog[target] = [];
                if (status == 'finish' || status == 'install')
                    return;

                if (status == 'start') {
                    $scope.singleLog[target] = [];
                    $timeout();
                    return;
                }

                if (status == 'chart') {
                    data.message = JSON.parse(data.message);
                    drawChart(target, data);
                    return;
                }

                $scope.singleLog[target].push(data);
            }

            $timeout();
        };

        let socket = new io.connect('/');

        socket.on('connect', ()=> {
            socket.send({channel: 'log', name: PATH});
            socket.send({channel: 'status', name: PATH});
        });

        socket.on('message', function (data) {
            if (socketHandler[data.channel])
                socketHandler[data.channel](data);
        });

        // class: Code Editor
        // create codemirror
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
                    indentUnit: 4,
                    readOnly: $scope.ACCESS_STATUS !== 'GRANTALL',
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
            socket.send({channel: 'logclear', name: PATH});
            $scope.chartLog = {};
            $timeout();
        };

        $scope.click.save = function (isNotShow) {
            var runnable = {
                path: PATH,
                lib: JSON.stringify($scope.lib),
                scripts: JSON.stringify($scope.flowpipe)
            };

            API.script.save(runnable).then((result)=> {
                if (result.status) $scope.status.lastSaved = new Date().format('yyyy-MM-dd HH:mm:ss');
                if (result.status && !isNotShow) $scope.alert.show($scope.app + ' saved!');
                $timeout();
            });
        };

        $scope.click.export = function () {
            window.open('/api/script/export?path=' + encodeURI(PATH), '_blank');
        };

        $scope.click.exportRun = function () {
            window.open('/api/script/exportScript?path=' + encodeURI(PATH), '_blank');
        };

        $scope.click.log = function () {
            $scope.status.logView = !$scope.status.logView;
            $timeout();
        };

        $scope.click.editTitle = function (rename) {
            $scope.titleEdit = false;
            $timeout();

            let PARENT = PATH.split('/');
            PARENT.splice(0, 1);
            let CURRENT = $scope.finder[0].narrower;
            let p = null;
            for (let i = 0; i < PARENT.length; i++) {
                let changed = false;
                for (let j = 0; j < CURRENT.length; j++) {
                    if (CURRENT[j].name == PARENT[i].replace('.satbook', '')) {
                        p = CURRENT[j];
                        CURRENT = CURRENT[j].narrower;
                        changed = true;
                        break;
                    }
                }

                if (!changed) {
                    p = null;
                    CURRENT = null;
                    break;
                }
            }

            let pathmap = p.path.split('/');
            pathmap.splice(0, 1);
            p.name = rename;
            let newPath = '';
            for (let i = 0; i < pathmap.length - 1; i++)
                newPath += '/' + pathmap[i];
            newPath += '/' + rename + '.satbook';
            p.path = newPath;
            p.PATH = p.path.split('/');
            p.PATH.splice(0, 1);
            localStorage.finder = JSON.stringify($scope.finder);
            API.script.rename(PATH, rename);
        };

        $scope.click.run = function () {
            if ($scope.status.running === 'running') {
                API.script.stop(PATH);
            } else {
                if ($scope.status.focused == -1) {
                    $scope.status.singleFocused = 'libs';
                } else {
                    if (!$scope.flowpipe[$scope.status.focused]) return;
                    $scope.status.singleFocused = $scope.status.focused;
                    if ($scope.singleLog[$scope.status.focused])
                        $scope.singleLog[$scope.status.focused].splice(0);
                }

                if ($scope.chartLog[$scope.status.singleFocused])
                    $scope.chartLog[$scope.status.singleFocused] = {};

                localStorage['preFocused-' + $scope.app] = $scope.status.singleFocused;

                var runnable = {
                    runpath: PATH,
                    target: $scope.status.focused,
                    lib: JSON.stringify($scope.lib),
                    scripts: JSON.stringify($scope.flowpipe)
                };

                API.script.run(runnable);
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

        $scope.$watch('inputLong', ()=> {
            localStorage.inputLong = JSON.stringify($scope.inputLong);
            $scope.event.changed();
        }, true);

        // class: File Browser
        let finder = {};
        finder.findParent = (node)=> {
            let PARENT = node.PATH.slice(0, node.PATH.length - 1);

            let CURRENT = $scope.finder[0].narrower;
            let p = null;
            for (let i = 0; i < PARENT.length; i++) {
                let changed = false;
                for (let j = 0; j < CURRENT.length; j++) {
                    if (CURRENT[j].name == PARENT[i]) {
                        p = CURRENT[j];
                        CURRENT = CURRENT[j].narrower;
                        changed = true;
                        break;
                    }
                }

                if (!changed) {
                    p = null;
                    CURRENT = null;
                    break;
                }
            }

            return p;
        };

        $scope.status.finder = {};
        $scope.status.finder.createType = 'project';
        $scope.status.finder.createName = 'new';
        $scope.click.finder = {};
        $scope.click.finderRight = {};

        $scope.click.finderList = (node)=> {
            if (node.type == 'folder') {
                if (node.collapsed) {
                    node.narrower = [{type: 'none', path: 'none', name: 'loading ...', narrower: [], PATH: []}];
                    $timeout();
                    API.browse.list(node.PATH, true).then((data)=> {
                        if (!node.narrower) node.narrower = [];

                        for (let i = 0; i < data.length; i++) {
                            if (data[i].type == 'folder') {
                                data[i].narrower = [];
                                data[i].collapsed = true;
                            }

                            data[i].PATH = data[i].path.split('/');
                            data[i].PATH.splice(0, 1);
                        }

                        data.sort((a, b)=> {
                            if (b.name == 'node_modules') return 1;
                            if (a.name == 'node_modules') return -1;
                            if (a.type === b.type) return a.name.localeCompare(b.name);
                            return b.type.localeCompare(a.type);
                        });

                        node.narrower = data;
                        node.collapsed = !node.collapsed;
                        $timeout();
                        localStorage.finder = JSON.stringify($scope.finder);
                    });
                } else {
                    node.narrower = [];
                    node.collapsed = !node.collapsed;
                    $timeout();
                    localStorage.finder = JSON.stringify($scope.finder);
                }
            } else if (node.type == 'project') {
                if (node.path == PATH) return;

                var runnable = {
                    path: PATH,
                    lib: JSON.stringify($scope.lib),
                    scripts: JSON.stringify($scope.flowpipe)
                };

                if ($scope.ACCESS_POLICY === 'READONLY') {
                    location.href = `/project.html#${encodeURI(node.path)}`;
                    location.reload();
                    return;
                }

                API.script.save(runnable).then(()=> {
                    location.href = `/project.html#${encodeURI(node.path)}`;
                    location.reload();
                    $timeout();
                });
            } else {
                var jsext = '.js';
                if (node.name.indexOf(jsext) == node.name.length - jsext.length) {
                    location.href = '/viewer.html#' + encodeURI(node.path);
                    return;
                } else {
                    window.open('/api/browse/download?filepath=' + encodeURI(node.path), '_blank');
                }
                return;
            }
        };

        if (localStorage.finder) {
            $scope.finder = JSON.parse(localStorage.finder);
        } else {
            $scope.finder = [{type: 'folder', path: '/', name: 'root', narrower: [], PATH: [], collapsed: true}];
            $scope.click.finderList($scope.finder[0]);
        }

        // upload
        $scope.click.finder.upload = function () {
            let {node} = $scope.status.finder;

            let ROOT = null;
            let PARENT = null;
            if (node.type == 'folder') {
                PARENT = node;
                ROOT = node.PATH;
            } else {
                PARENT = finder.findParent(node);
                if (!PARENT) return;
                ROOT = PARENT.PATH;
            }

            if (PARENT && ROOT) {
                let files = $('#upload input')[0].files;
                if (files.length <= 0) return;

                $scope.status.uploading = true;

                API.browse.upload(ROOT, {'./': files}).then((data)=> {
                    $scope.status.uploading = false;
                    $scope.current = data;
                    $scope.click.finderList(PARENT);
                    $scope.click.finderList(PARENT);
                    $('#upload').modal('hide');
                    $('#upload input').val('');
                });
            }
        };

        $scope.click.finderRight.upload = (node)=> {
            $scope.status.finder.node = node;
            $('#upload').modal('show');
        };

        // add
        $scope.click.finder.create = ()=> {
            let {node, createType, createName} = $scope.status.finder;

            let ROOT = null;
            let PARENT = null;
            if (node.type == 'folder') {
                PARENT = node;
                ROOT = node.PATH;
            } else {
                PARENT = finder.findParent(node);
                if (!PARENT) return;
                ROOT = PARENT.PATH;
            }

            if (createType == 'project') {
                let projectRoot = PARENT.path;
                if (projectRoot.indexOf('/') !== 0) projectRoot = '/' + projectRoot;
                if (projectRoot.length === 1)
                    projectRoot = '';

                location.href = '#' + encodeURI(projectRoot + '/' + createName + '.satbook');
                location.reload();
                return;
            }

            if (PARENT && ROOT && createName && createType) {
                API.browse.create(ROOT, createType, createName).then(()=> {
                    $('#create').modal('hide');
                    $scope.status.finder.createName = 'new';
                    $scope.click.finderList(PARENT);
                    $scope.click.finderList(PARENT);
                    $timeout();
                });
            }
        };

        $scope.click.finderRight.add = (node)=> {
            $scope.status.finder.node = node;
            $('#create').modal('show');
        };

        // delete
        $scope.click.finderRight.delete = (node)=> {
            let PARENT = node.PATH.slice(0, node.PATH.length - 1);

            let CURRENT = $scope.finder[0].narrower;
            for (let i = 0; i < PARENT.length; i++) {
                let changed = false;
                for (let j = 0; j < CURRENT.length; j++) {
                    if (CURRENT[j].name == PARENT[i]) {
                        CURRENT = CURRENT[j].narrower;
                        changed = true;
                        break;
                    }
                }

                if (!changed) {
                    CURRENT = null;
                    break;
                }
            }

            API.browse.delete(node.PATH.slice(0, node.PATH.length - 1), [node.path]).then((data)=> {
                if (CURRENT) {
                    let finding = -1;
                    for (let i = 0; i < CURRENT.length; i++) {
                        if (CURRENT[i].path == node.path) {
                            finding = i;
                        }
                    }
                    CURRENT.splice(finding, 1);
                    $timeout();
                    localStorage.finder = JSON.stringify($scope.finder);
                }
            });
        };

        // rename
        $scope.click.finder.rename = (node)=> {
            let PARENT = finder.findParent(node);
            if (!PARENT) PARENT = $scope.finder[0];

            API.browse.rename(node.path, node.type, node.rename).then((resp)=> {
                $('#rename').modal('hide');
                $scope.click.finderList(PARENT);
                $scope.click.finderList(PARENT);

                if (PATH.indexOf(node.path) == 0)
                    PATH = PATH.replace(node.path, resp.path);

                location.href = '/project.html#' + PATH;
                location.reload();

                $timeout();
            });
        };

        $scope.click.finderRight.rename = (node)=> {
            $scope.status.finder.node = node;
            $scope.status.finder.node.rename = $scope.status.finder.node.name;
            $timeout();
            $('#rename').modal('show');
        };
    });
});