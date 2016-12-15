app.controller("ctrl", function ($scope, $timeout, API) {
    $scope.preLoading = true;

    API.user.check().then((ACCESS_INFO)=> {
        $scope.ACCESS_STATUS = ACCESS_INFO.status;
        $scope.ACCESS_POLICY = ACCESS_INFO.policy;

        $timeout();

        let PATH = location.href.split('#')[1] ? decodeURI(location.href.split('#')[1]) : '';
        $scope.PATH = [];

        var preSelectedNode = {};
        var preSelectedFolder = {};

        globalScope($scope, $timeout, API);

        // Function
        let reloadView = (_PATH)=> {
            if (!PATH) PATH = '/';
            let activated = $(`.fjs-filename[value='${_PATH ? _PATH : PATH}']`).parent().parent().parent();

            if (activated.length == 0) {
                $timeout(()=> {
                    reloadView(_PATH);
                }, 50);
                return;
            }

            activated.click();
        };

        let openFile = (parent)=> {
            if (parent.type == 'project') {
                location.href = `/project.html#${encodeURI(parent.path)}`;
            } else {
                let allowed = ['.js', '.html', '.jade', '.css', '.less'];
                for (let i = 0; i < allowed.length; i++) {
                    if (parent.name.indexOf(allowed[i]) == parent.name.length - allowed[i].length) {
                        location.href = '/viewer.html#' + encodeURI(parent.path);
                        return;
                    }
                }

                window.open('/api/browse/download?filepath=' + encodeURI(parent.path), '_blank');
            }
        };

        // Load and Update List
        let loaderStatus = false;

        let preLoader = (PRE_PATH, idx, cnt)=> {
            if (!cnt) cnt = 0;
            if (PRE_PATH.length <= idx) {
                $scope.preLoading = false;
                $timeout();
                return;
            }

            let clickable = '';

            for (let ci = 1; ci <= idx; ci++)
                clickable += '/' + PRE_PATH[ci];

            if (clickable == 'path-')
                clickable += '/';

            if (clickable == '') clickable = '/';

            location.href = '#' + clickable;

            let spanFileName = $('span.fjs-filename');

            for (let i = 0; i < spanFileName.length; i++) {
                let attr = $(spanFileName[i]).attr('value');
                if (attr == clickable) {
                    if (loaderStatus) {
                        setTimeout(()=> {
                            preLoader(PRE_PATH, idx, cnt + 1);
                        }, 200);
                        return;
                    }

                    loaderStatus = true;
                    $(spanFileName[i]).click();
                    preLoader(PRE_PATH, idx + 1);
                    return;
                }
            }

            if (cnt < 5) {
                setTimeout(()=> {
                    preLoader(PRE_PATH, idx, cnt + 1);
                }, 200);
            }
        };

        let emitter = finder(document.getElementById('finder'), (parent, cfg, callback)=> {
            let setData = (data, isTop)=> {
                let result = [];
                for (let i = 0; i < data.length; i++) {
                    if (isTop == false && data[i].type == 'upper') continue;
                    let fa = '';
                    if (data[i].type == 'folder') fa += '<i class="fa fa-folder"></i>';
                    else if (data[i].type == 'file') fa += '<i class="fa fa-file-o"></i>';
                    else if (data[i].type == 'project') fa += '<i class="fa fa-code-fork"></i>';
                    result.push({
                        label: `${fa} <span class="fjs-filename" value="${data[i].path}" data='${encodeURI(JSON.stringify(data[i]))}'>${data[i].name}</span>`,
                        name: data[i].name,
                        type: data[i].type,
                        path: data[i].path
                    });
                }
                return result;
            };

            if (!parent) {
                callback([{
                    label: '<i class="fa fa-folder"></i> <span class="fjs-filename" value="/">root</span>',
                    name: 'root',
                    type: 'folder',
                    path: '/'
                }]);

                preLoader(PATH.split('/'), 0);
            } else if (parent.type == 'folder') {
                preSelectedFolder = parent;
                preSelectedNode = parent;
                $scope.PATH = parent.path.split('/');
                $scope.PATH.splice(0, 1);
                location.href = `#${encodeURI(parent.path)}`;

                API.browse.list($scope.PATH).then((data)=> {
                    callback(setData(data, false));
                    loaderStatus = false;
                });
            } else if (parent.type == 'upper') {
                $scope.PATH.splice($scope.PATH.length - 1, 1);
                let path = '';
                for (let i = 0; i < $scope.PATH.length; i++)
                    path += '/' + $scope.PATH[i];
                PATH = path;
                location.href = `#${encodeURI(path)}`;
                location.reload();
            } else {
                if (preSelectedNode.path == parent.path)
                    openFile(parent);

                let fa = '';
                if (parent.type == 'folder') fa += '<i class="fa fa-folder"></i>';
                else if (parent.type == 'file') fa += '<i class="fa fa-file-o"></i>';
                else if (parent.type == 'project') fa += '<i class="fa fa-code-fork"></i>';

                let div = $(
                    `<div class="leaf-col"><div class="leaf-col"><div class="leaf-col-container">
                        <div class="icon">
                            ${fa}
                        </div>
                        <div class="title">
                            ${parent.name}
                        </div>
                        <div class="action-button">
                            <button class="btn btn-default open">Open</button>
                            <button class="btn btn-default delete">Delete</button>
                        </div>
                    </div></div></div>`
                );

                emitter.emit('create-column', div[0]);

                $('.leaf-col-container .delete').each(function () {
                    $(this).click(()=> {
                        API.browse.delete($scope.PATH, [preSelectedNode.path]).then(()=> {
                            reloadView();
                        });
                    });
                });

                $('.leaf-col-container .open').each(function () {
                    $(this).click(()=> {
                        openFile(parent);
                    });
                });

                preSelectedNode = parent;
            }
        });

        // class: contextMenu
        let PASTE_DATA = null;

        let contextMenu = {};

        contextMenu.rename = (options, selected)=> {
            $scope.status.finder.node = selected;
            $scope.status.finder.node.rename = $scope.status.finder.node.name;
            $timeout();
            $('#rename').modal('show');
        };

        contextMenu.add = (options, selected)=> {
            $scope.status.finder.selectedDir = selected.path;
            $timeout();
            $('#create-in-dir').modal('show');
        };

        contextMenu.copy = (options, selected)=> {
            PASTE_DATA = selected;
        };

        contextMenu.paste = (options, selected)=> {
            API.browse.copy(PASTE_DATA.path, selected.path).then(()=> {
                let TMP_PATH = PATH + '';
                reloadView(selected.path);
                if (selected.path != TMP_PATH)
                    reloadView(TMP_PATH);
            });
        };

        contextMenu.delete = (options, selected)=> {
            if (selected.path == '/') return;

            if (selected.type == 'favorite') {
                let defaultList = localStorage.favorite ? JSON.parse(localStorage.favorite) : [{
                    label: '<i class="fa fa-folder"></i> <span class="fjs-filename" value="/">Home</span>',
                    name: 'home',
                    type: 'folder',
                    path: '/'
                }];

                for (let i = 0; i < defaultList.length; i++) {
                    if (defaultList[i].path == selected.path) {
                        defaultList.splice(i, 1);
                        i--;
                    }
                }

                localStorage.favorite = JSON.stringify(defaultList);
                location.reload();
                return;
            }

            API.browse.delete($scope.PATH, [selected.path]).then(()=> {
                if (selected.type === 'folder') {
                    $scope.PATH.splice($scope.PATH.length - 1, 1);
                    let path = '';
                    for (let i = 0; i < $scope.PATH.length; i++)
                        path += '/' + $scope.PATH[i];
                    PATH = path;
                    location.href = `#${encodeURI(path)}`;
                }

                $(`.fjs-filename[value='${selected.path}']`).parent().parent().parent().remove();
            });
        };

        contextMenu.download = (options, selected)=> {
            if (selected.type == 'project') {
                window.open('/api/script/export?path=' + encodeURI(selected.path), '_blank');
            } else {
                window.open('/api/browse/download?filepath=' + encodeURI(selected.path), '_blank');
            }
        };

        emitter.on('column-created', ()=> {
            $.contextMenu({
                selector: '.fjs-item',
                callback: function (key, options) {
                    let selected = {type: 'folder', path: '/'};

                    if ($(this).find('span').attr('data')) {
                        selected = JSON.parse(decodeURI($(this).find('span').attr('data')));
                    }

                    if (contextMenu[key])
                        contextMenu[key](options, selected);
                },
                items: {
                    rename: {
                        name: "Rename", icon: "fa-edit", disabled: function () {
                            return !$(this).find('span').attr('data');
                        }
                    },
                    copy: {
                        name: "Copy", icon: "fa-copy", disabled: function () {
                            return !$(this).find('span').attr('data');
                        }
                    },
                    paste: {
                        name: "Paste", icon: "fa-paste", disabled: function () {
                            try {
                                let fileType = JSON.parse(decodeURI($(this).find('span').attr('data'))).type;
                                return fileType != 'folder' || !PASTE_DATA;
                            } catch (e) {
                                return !PASTE_DATA;
                            }
                        }
                    },
                    delete: {
                        name: "Delete", icon: "fa-trash", disabled: function () {
                            return !$(this).find('span').attr('data');
                        }
                    },
                    download: {
                        name: "Download", icon: "fa-download", disabled: function () {
                            return !$(this).find('span').attr('data');
                        }
                    },
                }
            });

            $.contextMenu({
                selector: '.fjs-col',
                callback: function (key, options) {
                    let selected = {type: 'folder', path: PATH};
                    try {
                        selected = JSON.parse(decodeURI($(this).find('span').attr('data')));
                    } catch (e) {
                    }

                    selected.type = 'folder';
                    selected.path = selected.path.split('/');
                    selected.path.splice(0, 1);
                    let tmp = '';
                    for (let i = 0; i < selected.path.length - 1; i++)
                        tmp += '/' + selected.path[i]
                    if (!tmp) tmp = '/';
                    selected.path = tmp;
                    delete selected.name;

                    if (contextMenu[key])
                        contextMenu[key](options, selected);
                },
                items: {
                    add: {name: "Add", icon: "add"},
                    paste: {name: "Paste", icon: "paste", disabled: ()=> !PASTE_DATA}
                }
            });
        });

        // class: action in button
        // Create Files
        $scope.click.finder.create = (to)=> {
            let {createType, createName} = $scope.status.finder;

            if (createType == 'project') {
                let rootPath = '';
                for (let i = 0; i < $scope.PATH.length; i++)
                    rootPath += '/' + $scope.PATH[i];

                location.href = '/project.html#' + encodeURI((to ? to : rootPath) + '/' + createName + '.satbook');
                return;
            }

            if (createName && createType) {
                let target = $scope.PATH;
                if (to) {
                    target = to.split('/');
                    target.splice(0, 1);
                }

                API.browse.create(target, createType, createName).then(()=> {
                    $('#create').modal('hide');
                    $('#create-in-dir').modal('hide');
                    $scope.createName = 'new';

                    if (to) {
                        let TMP_PATH = PATH;
                        let PARENT = '';
                        for (let i = 0; i < target.length; i++)
                            PARENT += '/' + target[i];
                        if (PARENT == '') PARENT = '/';
                        reloadView(PARENT);

                        if (PARENT != TMP_PATH)
                            reloadView(TMP_PATH);
                    } else {
                        reloadView();
                    }

                    $timeout();
                });
            }
        };

        // Delete Files
        $scope.click.delete = function () {
            API.browse.delete($scope.PATH, [preSelectedNode.path]).then(()=> {
                $scope.PATH.splice($scope.PATH.length - 1, 1);
                let path = '';
                for (let i = 0; i < $scope.PATH.length; i++)
                    path += '/' + $scope.PATH[i];
                PATH = path;
                location.href = `#${encodeURI(path)}`;
                location.reload();
            });
        };

        // Upload Files
        $scope.event.upload = (files)=> new Promise((resolve)=> {
            let {PATH} = $scope;
            $scope.status.uploading = true;

            API.browse.upload(PATH, files).then(()=> {
                $scope.status.uploading = false;
                reloadView();
                $timeout(resolve);
            });
        });

        $scope.click.finder.upload = function () {
            let files = $('#upload input')[0].files;
            if (files.length <= 0) return;

            $scope.event.upload({'./': $('#upload input')[0].files}).then(()=> {
                $('#upload').modal('hide');
                $('#upload input').val('');
            });
        };

        // rename
        $scope.click.finder.rename = (node)=> {
            API.browse.rename(node.path, node.type, node.rename).then((resp)=> {
                $('#rename').modal('hide');
                let TMP_PATH = PATH;
                let PARENT = '';
                for (let i = 1; i < node.path.split('/').length - 1; i++)
                    PARENT += '/' + node.path.split('/')[i];
                if (PARENT == '') PARENT = '/';
                reloadView(PARENT);

                if (PARENT != TMP_PATH)
                    reloadView(TMP_PATH);
                $timeout();
            });
        };
    });
});