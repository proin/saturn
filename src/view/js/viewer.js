app.controller("ctrl", function ($scope, $timeout, API) {
    API.user.check().then((ACCESS_INFO)=> {
        $scope.ACCESS_STATUS = ACCESS_INFO.status;
        $scope.ACCESS_POLICY = ACCESS_INFO.policy;

        let PATH = decodeURI(location.href.split('#')[1]);
        let EXT = PATH.split('.');
        EXT = EXT[EXT.length - 1];

        $scope.PATH = PATH;
        $scope.ROOT_PATH = `/`;
        $scope.status = {};
        $scope.click = {};

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

        let socket = new io.connect('/');

        socket.on('connect', ()=> {
            socket.send({channel: 'status', name: PATH});
        });

        socket.on('message', function (data) {
            if (socketHandler[data.channel])
                socketHandler[data.channel](data);
        });

        // class: file
        $scope.file = location.href.split('#')[1];

        $scope.value = '';

        $scope.history = function () {
            window.history.back();
        };

        API.browse.read($scope.file).then((data)=> {
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
            keymap[cmdkey + '-S'] = function () {
                $scope.click.save(true);
            };

            let codeMode = 'javascript';

            if (EXT.toLowerCase() == 'html') codeMode = 'application/x-ejs';
            if (EXT.toLowerCase() == 'jade') codeMode = 'jade';
            if (EXT.toLowerCase() == 'css') codeMode = 'css';
            if (EXT.toLowerCase() == 'less') codeMode = 'text/x-less';

            CodeMirror(document.getElementById('code-editor'), {
                height: 'auto',
                value: data.data,
                lineNumbers: true,
                lineWrapping: true,
                extraKeys: keymap,
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                viewportMargin: Infinity,
                indentUnit: 4,
                readOnly: $scope.ACCESS_STATUS !== 'GRANTALL',
                mode: codeMode
            }).on('change', function (e) {
                var changeValue = e.getValue();
                $scope.value = changeValue;
            });
            $timeout();
        });

        $scope.status.lastSaved = new Date().format('yyyy-MM-dd HH:mm:ss');
        $scope.click.save = function () {
            API.browse.save($scope.file, $scope.value).then((data)=> {
                if (data.status) {
                    $scope.status.lastSaved = new Date().format('yyyy-MM-dd HH:mm:ss');
                    $timeout();
                }
            });
        };

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
                location.href = `/project.html#${encodeURI(node.path)}`;
                $timeout();
            } else {
                let allowed = ['.js', '.html', '.jade', '.css', '.less'];
                for (let i = 0; i < allowed.length; i++) {
                    if (node.name.indexOf(allowed[i]) == node.name.length - allowed[i].length) {
                        location.href = '/viewer.html#' + encodeURI(node.path);
                        location.reload();
                        return;
                    }
                }

                window.open('/api/browse/download?filepath=' + encodeURI(node.path), '_blank');
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