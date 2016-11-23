app.controller("ctrl", function ($scope, $timeout, API) {
    API.user.check().then((ACCESS_INFO)=> {
        $scope.ACCESS_STATUS = ACCESS_INFO.status;
        $scope.ACCESS_POLICY = ACCESS_INFO.policy;

        let PATH = decodeURI(location.href.split('#')[1]);
        $scope.PATH = PATH;
        $scope.ROOT_PATH = `/`;
        $scope.status = {};
        $scope.click = {};

        // logger
        let logger = ()=> {
            var MAX_LOG_SIZE = 500;
            API.script.running().then((data)=> {
                $scope.status.runningLog = data;
                $timeout(logger, 1000);
            });
        };

        logger();

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
                mode: "javascript"
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

        // lib: File Browser

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

        if (localStorage.finder) {
            $scope.finder = JSON.parse(localStorage.finder);
        } else {
            $scope.finder = [{type: 'folder', path: '/', name: 'root', narrower: [], PATH: [], collapsed: true}];
            $scope.click.finderList($scope.finder[0]);
        }

        $scope.click.finder = {};

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

        $scope.click.finderRight = {};

        $scope.click.finderRight.upload = (node)=> {
            $scope.status.finder.node = node;
            $('#upload').modal('show');
        };

        $scope.click.finderRight.add = (node)=> {
            $scope.status.finder.node = node;
            $('#create').modal('show');
        };

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
                if ($scope.value && $scope.value.length > 0) {
                    if ($scope.ACCESS_POLICY === 'READONLY') {
                        location.href = `/project.html#${encodeURI(node.path)}`;
                        return;
                    }

                    API.browse.save($scope.file, $scope.value).then((data)=> {
                        location.href = `/project.html#${encodeURI(node.path)}`;
                    });
                } else {
                    location.href = `/project.html#${encodeURI(node.path)}`;
                }
            } else {
                var jsext = '.js';
                if (node.name.indexOf(jsext) == node.name.length - jsext.length) {
                    if ($scope.ACCESS_POLICY === 'READONLY') {
                        location.href = '/viewer.html#' + encodeURI(node.path);
                        location.reload();
                        return;
                    }

                    if ($scope.value && $scope.value.length > 0) {
                        API.browse.save($scope.file, $scope.value).then((data)=> {
                            location.href = '/viewer.html#' + encodeURI(node.path);
                            location.reload();
                        });
                    } else {
                        location.href = '/viewer.html#' + encodeURI(node.path);
                        location.reload();
                    }
                } else {
                    window.open('/api/browse/download?filepath=' + encodeURI(node.path), '_blank');
                }
                return;
            }
        };
    });
});