app.controller("ctrl", ($scope, $timeout, API)=> {
    API.user.check().then((ACCESS_INFO)=> {
        $scope.ACCESS_STATUS = ACCESS_INFO.status;
        $scope.ACCESS_POLICY = ACCESS_INFO.policy;

        let PATH = decodeURI(location.href.split('#')[1]);
        $scope.PATH = PATH;
        $scope.ROOT_PATH = `/`;
        $scope.app = decodeURI(location.href.split('#')[1]).basename();

        $scope.click = {};
        $scope.event = {};
        $scope.status = {};
        $scope.status.view = 'editor';

        // class: alert
        $scope.alert = {};
        $scope.alert.message = '';
        $scope.alert.show = function (message) {
            $scope.alert.message = message;
            $('#alert').modal('show');
            $timeout();
        };

        // class: history back
        $scope.history = function () {
            let PATH = $scope.PATH.split('/');
            PATH.splice(0, 1);
            PATH.splice(PATH.length - 1, 1);
            let path = '';
            for (let i = 0; i < PATH.length; i++)
                path += '/' + PATH[i];
            location.href = `/#${encodeURI(path)}`;
        };

        // variable: ui
        $scope.inputLong = localStorage.inputLong ? JSON.parse(localStorage.inputLong) : {};
        $scope.outputLong = {};
        $scope.titleEdit = false;
        $scope.appRename = $scope.app;

        // variable: status
        $scope.status.focused = -1;
        $scope.status.singleFocused = localStorage['preFocused-' + $scope.app] ? localStorage['preFocused-' + $scope.app] : 'libs';
        $scope.status.indent = [];
        $scope.status.logView = false;
        $scope.status.lastSaved = new Date().format('yyyy-MM-dd HH:mm:ss');

        // variable: script variables
        $scope.lib = {id: 'lib', type: 'lib', value: ''};
        $scope.flowpipe = [];

        // api: load script data
        API.script.load($scope.PATH).then((data)=> {
            if (data.err) return;
            $scope.lib = data.lib;
            $scope.flowpipe = data.scripts;
            $scope.event.changed();
        });

        // class: chart
        let drawChart = (target, data, type)=> {
            data.message.graph = type;
            if (!$scope.chartLog[target]) $scope.chartLog[target] = {};
            $scope.chartLog[target][data.message.id] = data.message;

            if (!data.message.data.width) data.message.data.width = 300;
            if (!data.message.data.height) data.message.data.height = 300;
            if (!data.message.data.options) data.message.data.options = {};

            if (type == 'vis') {
                let visData = data.message.data;

                let nodes = new vis.DataSet(visData.nodes);
                let edges = new vis.DataSet(visData.edges);

                let visNetworkData = {
                    nodes: nodes,
                    edges: edges
                };

                let render = ()=> {
                    let ctx = document.getElementById('chart-' + target + '-' + data.message.id);
                    if (!ctx) {
                        $timeout(()=> {
                            render();
                        }, 100);
                        return;
                    }

                    ctx.style.width = data.message.data.width;
                    ctx.style.height = data.message.data.height;

                    new vis.Network(ctx, visNetworkData, visData.options ? visData.options : {});
                };

                render();
            }

            if (type == 'chart') {
                data.message.data.options.responsive = false;

                let render = ()=> {
                    let ctx = document.getElementById('chart-' + target + '-' + data.message.id);
                    if (!ctx) {
                        $timeout(()=> {
                            render();
                        }, 100);
                        return;
                    }

                    ctx.width = data.message.data.width;
                    ctx.height = data.message.data.height;

                    Chart.defaults.global.animation.duration = 0;
                    new Chart(ctx, data.message.data);
                };

                render();
            }
        };

        // variable: logger
        $scope.status.running = null;
        $scope.status.runningLog = {};
        $scope.singleLog = {};
        $scope.chartLog = {};

        // class: socket for logger
        let socketHandler = {};

        socketHandler.status = (message)=> {
            let {type, data, name} = message;
            if (type == 'list') {
                $scope.status.runningLog = data;
                $scope.status.running = data[PATH];

                let __click = [];
                for (let __PATH in data)
                    if (data[__PATH])
                        __click.push(__PATH);

                let __preloader = (_ti)=> {
                    let target = __click[_ti];
                    if (!target) return;

                    let a = target.split('/');
                    a.splice(0, 1);
                    let _ = (_i)=> {
                        if (!a[_i])
                            return __preloader(_ti + 1);
                        let _target = '';

                        for (let __i = 0; __i < _i; __i++)
                            _target += '/' + a[__i];
                        if (!_target) _target = '/';

                        let ci = $(`.finder-view li span[data-target="menu-${_target}"]`);

                        if (ci.length == 0) {
                            $timeout(()=> {
                                _(_i);
                            }, 10);
                            return;
                        }

                        if (ci.parent().find('li').length === 0 && _target !== '/')
                            ci.click();
                        _(_i + 1);
                    };

                    _(0);
                };

                __preloader(0);
            } else if (type == 'message') {
                $scope.status.runningLog[name] = data;
                if (name == PATH)
                    $scope.status.running = data;
            } else if (type == 'install') {
                if (data == 'finish') {
                    $scope.status.running = null;
                } else {
                    $scope.status.running = 'running';
                }
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
                        if (status == 'chart' || status == 'vis') {
                            data[work][i].message = JSON.parse(data[work][i].message);
                            chartOrdered.unshift({type: status, name: work, data: data[work][i]});
                            continue;
                        }

                        row.unshift(data[work][i]);
                    }

                    for (let i = 0; i < chartOrdered.length; i++)
                        drawChart(chartOrdered[i].name, chartOrdered[i].data, chartOrdered[i].type);

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

                if (status == 'chart' || status == 'vis') {
                    data.message = JSON.parse(data.message);
                    drawChart(target, data, status);
                    return;
                }

                $scope.singleLog[target].push(data);
                if ($scope.singleLog[target].length > 500)
                    $scope.singleLog[target].splice(0, $scope.singleLog[target].length - 500);
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
        let codemirror = function (_id) {
            let creator = function (id) {
                let fidx = $scope.event.findIndex(id.replace('code-editor-', ''));
                let value = '';
                let _mode = 'javascript';
                if (id == 'code-editor-libs') {
                    $scope.lib.value = $scope.lib.value ? $scope.lib.value : "// load npm libraries\nconst fs = require('fs');";
                    value = $scope.lib.value;
                } else {
                    value = $scope.flowpipe[fidx].value;
                    if ($scope.flowpipe[fidx].type == 'python') {
                        _mode = {
                            name: "text/x-cython",
                            version: 2,
                            singleLineStringErrors: false
                        };
                    }
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
                    mode: _mode
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

        $scope.click.list = ()=> {
            $('.finder-view').toggleClass('fixed');
        };

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

        $scope.loopwork = {};

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
                $scope.loopwork[k] = list;
            }

            $timeout();
        };

        $scope.$watch('inputLong', ()=> {
            localStorage.inputLong = JSON.stringify($scope.inputLong);
            $scope.event.changed();
        }, true);

        // class: finder
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
                    });
                } else {
                    node.narrower = [];
                    node.collapsed = !node.collapsed;
                    $timeout();
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
                let allowed = ['.js', '.html', '.jade', '.css', '.less'];
                for (let i = 0; i < allowed.length; i++) {
                    if (node.name.indexOf(allowed[i]) == node.name.length - allowed[i].length) {
                        location.href = '/viewer.html#' + encodeURI(node.path);
                        return;
                    }
                }

                window.open('/api/browse/download?filepath=' + encodeURI(node.path), '_blank');
            }
        };

        $scope.finder = [{type: 'folder', path: '/', name: 'home', narrower: [], PATH: [], collapsed: true}];

        let PRELOAD_PATH = $scope.PATH.split('/');
        PRELOAD_PATH.splice(0, 1);
        PRELOAD_PATH.splice(PATH.length - 1, 1);

        let preLoad = (idx)=> {
            if (!PRELOAD_PATH[idx]) return;

            let DATA_TARGET = '';
            for (let i = 0; i < idx; i++)
                DATA_TARGET += '/' + PRELOAD_PATH[i];
            if (!DATA_TARGET) DATA_TARGET = '/';

            let ci = $(`.finder-view li span[data-target="menu-${DATA_TARGET}"]`);
            if (ci.length == 0) {
                $timeout(()=> {
                    preLoad(idx);
                }, 10);
                return;
            }

            ci.click();
            preLoad(idx + 1);
        };

        preLoad(0);

        // upload
        $scope.click.finder.upload = function (isFolder) {
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
                let files = isFolder ? $('#upload-folder input')[0].files : $('#upload input')[0].files;
                if (files.length <= 0) return;

                $scope.status.uploading = true;

                let uploadData = {};

                for (let i = 0; i < files.length; i++) {
                    if (files[i].webkitRelativePath == "") {
                        if (!uploadData['./']) uploadData['./'] = [];
                        uploadData['./'].push(files[i]);
                    } else {
                        let dirname = './';
                        for (let j = 0; j < files[i].webkitRelativePath.split('/').length - 1; j++)
                            dirname += files[i].webkitRelativePath.split('/')[j] + '/';
                        if (!uploadData[dirname]) uploadData[dirname] = [];
                        uploadData[dirname].push(files[i]);
                    }
                }

                API.browse.upload(ROOT, uploadData).then((data)=> {
                    $scope.status.uploading = false;
                    $scope.current = data;
                    $scope.click.finderList(PARENT);
                    $scope.click.finderList(PARENT);

                    if (isFolder) {
                        $('#upload-folder').modal('hide');
                        $('#upload-folder input').val('');
                    } else {
                        $('#upload').modal('hide');
                        $('#upload input').val('');
                    }
                });
            }
        };

        $scope.click.finderRight.upload = (node, isFolder)=> {
            $scope.status.finder.node = node;
            if (isFolder)
                $('#upload-folder').modal('show');
            else
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

        // download
        $scope.click.finderRight.download = (node)=> {
            if (node.type == 'project') {
                window.open('/api/script/export?path=' + encodeURI(node.path), '_blank');
            } else {
                window.open('/api/browse/download?filepath=' + encodeURI(node.path), '_blank');
            }
        };

        // copy
        $scope.PASTE_DATA = null;
        $scope.click.finderRight.copy = (node)=> {
            $scope.PASTE_DATA = node;
            $timeout();
        };

        // paste
        $scope.click.finderRight.paste = (node)=> {
            if (!$scope.PASTE_DATA) return;
            if (node.type !== 'folder')
                node = finder.findParent(node);

            API.browse.copy($scope.PASTE_DATA.path, node.path).then(()=> {
                $scope.click.finderList(node);
                $scope.click.finderList(node);
            });
        };

        // class: project info
        let npath = PATH.split('/');
        npath.splice(0, 1);

        let packageJSON = null;
        $scope.project_info_bind = (node)=> {
            if (node.name == 'project') {
                node.collapsed = !node.collapsed;
            }

            if (node.name == 'node_modules') {
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
                    });
                } else {
                    node.narrower = [];
                    node.collapsed = !node.collapsed;
                    $timeout();
                }
            }

            if (node.name == 'package.json') {
                if ($scope.status.view == 'package.json')
                    return;

                $scope.status.view = 'package.json';

                API.browse.read(PATH + '/package.json').then((data)=> {
                    if (!data || !data.status) {
                        data = {};
                        data.data = '{}';
                    }

                    packageJSON = data.data;

                    CodeMirror(document.getElementById('code-editor-package-json'), {
                        height: 'auto',
                        value: packageJSON,
                        lineNumbers: true,
                        lineWrapping: true,
                        foldGutter: true,
                        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                        viewportMargin: Infinity,
                        indentUnit: 4,
                        readOnly: true,
                        mode: 'javascript'
                    }).on('change', function (e) {
                    });

                    $timeout();
                });
            }

            if (node.name == 'editor') {
                $scope.status.view = 'editor';
            }

            if (node.name == 'variable') {
                if($scope.status.view == 'variable')
                    return;

                $scope.status.view = 'variable';

                API.browse.read(PATH + '/variable.json').then((data)=> {
                    if (!data || !data.status) {
                        data = {};
                        data.data = '{}';
                    }

                    let variablesJSON = JSON.parse(data.data);

                    variablesJSON = JSON.stringify(variablesJSON, null, 4);

                    CodeMirror(document.getElementById('code-editor-variable'), {
                        height: 'auto',
                        value: variablesJSON,
                        lineNumbers: true,
                        lineWrapping: true,
                        foldGutter: true,
                        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                        viewportMargin: Infinity,
                        indentUnit: 4,
                        readOnly: false,
                        mode: 'javascript'
                    }).on('change', function (e) {
                        var changeValue = e.getValue();
                        try {
                            JSON.parse(changeValue);
                            API.browse.save(PATH + '/variable.json', changeValue).then((data)=> {
                                if (data.status) {
                                    $scope.status.lastSaved = new Date().format('yyyy-MM-dd HH:mm:ss');
                                    $timeout();
                                }
                            });
                        } catch (e) {
                        }
                    });

                    $timeout();
                });
            }

            if (node.name == 'setting') {
                if ($scope.status.view == 'config')
                    return;
                $scope.status.view = 'config';
                $timeout();
            }
        };

        API.browse.read(PATH + '/config.json').then((data)=> {
            if (!data || !data.status) {
                data = {};
                data.data = '{}';
            }

            $scope.config = JSON.parse(data.data);

            $scope.config.click = {};

            $scope.config.click.mailing = (type)=> {
                if (!$scope.config.mailing) $scope.config.mailing = {};
                $timeout(()=> {
                    $scope.config.mailing[type] = !$scope.config.mailing[type];
                });
            };

            $timeout();
        });

        $scope.$watch('config', ()=> {
            API.browse.save(PATH + '/config.json', JSON.stringify($scope.config));
        }, true);

        let arrayInserter = (append)=> {
            let res = [];
            res = res.concat(npath);
            res = res.concat(append);
            return res;
        };

        $scope.project_info = [
            {
                type: 'project_info', disabledContext: true, icon: 'fa-code-fork', path: PATH + '/root', name: 'project', PATH: npath, collapsed: false,
                narrower: [
                    {type: 'project_info', context: {delete: true}, icon: 'fa-folder', path: PATH + '/node_modules', name: 'node_modules', narrower: [], PATH: arrayInserter(['node_modules']), collapsed: true},
                    {type: 'project_info', disabledContext: true, icon: 'fa-book', path: PATH + '/package.json', name: 'package.json', narrower: [], PATH: arrayInserter(['package.json']), collapsed: true},
                    {type: 'project_info', disabledContext: true, icon: 'fa-book', path: PATH + '/editor', name: 'editor', narrower: [], collapsed: true},
                    {type: 'project_info', disabledContext: true, icon: 'fa-cogs', path: PATH + '/variable.json', name: 'variable', narrower: [], collapsed: true},
                    {type: 'project_info', disabledContext: true, icon: 'fa-cogs', path: PATH + '/config.json', name: 'setting', narrower: [], PATH: arrayInserter(['config.json']), collapsed: true}
                ]
            },
        ];
    });
});