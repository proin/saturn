window.finderTree = ($scope, $timeout, API)=> {
    let PATH = decodeURI(location.href.split('#')[1]);

    $scope.history = function () {
        let PATH = $scope.PATH.split('/');
        PATH.splice(0, 1);
        PATH.splice(PATH.length - 1, 1);
        let path = '';
        for (let i = 0; i < PATH.length; i++)
            path += '/' + PATH[i];
        location.href = `/#${encodeURI(path)}`;
    };

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
            if ($scope.status.view && $scope.status.view != 'editor') {
                $scope.status.view = 'editor';
                $timeout();
            }

            if (node.path == PATH) return;

            if ($scope.flowpipe && $scope.ACCESS_POLICY === 'GRANTALL') {
                let runnable = {
                    path: PATH,
                    lib: JSON.stringify($scope.lib),
                    scripts: JSON.stringify($scope.flowpipe)
                };

                API.script.save(runnable).then(()=> {
                    location.href = `/project.html#${encodeURI(node.path)}`;
                    $timeout(()=> location.reload(), 500);
                });
            } else {
                location.href = `/project.html#${encodeURI(node.path)}`;
                $timeout(()=> location.reload(), 500);
            }
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

            location.href = '/project.html#' + encodeURI(projectRoot + '/' + createName + '.satbook');
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
};