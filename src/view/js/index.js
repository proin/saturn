app.controller("ctrl", function ($scope, $timeout, API) {
    $scope.preLoading = true;

    API.user.check().then((ACCESS_INFO)=> {
        $scope.ACCESS_STATUS = ACCESS_INFO.status;
        $scope.ACCESS_POLICY = ACCESS_INFO.policy;

        $timeout();

        // Function
        $scope.event = {};
        $scope.click = {};

        // Variables
        $scope.status = {};

        let PATH = location.href.split('#')[1] ? decodeURI(location.href.split('#')[1]) : '';
        $scope.PATH = [];

        var preSelectedNode = {};
        var preSelectedFolder = {};

        $scope.createType = 'folder';
        $scope.createName = '';

        // Add Project
        $scope.click.add = function () {
            let {addName, PATH} = $scope;
            if (!addName) return;
            let rootPath = '';
            for (let i = 0; i < PATH.length; i++)
                rootPath += '/' + PATH[i];
            location.href = `/project.html#${encodeURI(rootPath + '/' + addName + '.satbook')}`;
        };

        // Signout
        $scope.click.signout = API.user.signout;

        let reloadView = ()=> {
            let isFolder = true;
            if (preSelectedNode && preSelectedNode.type != 'folder')
                isFolder = false;

            let activated = $('.fjs-active');
            if (isFolder) {
                if (activated.length == 0) {
                    location.reload();
                } else {
                    $(activated[activated.length - 1]).click();
                }
            } else {
                if (activated.length <= 1) {
                    location.reload();
                } else {
                    $(activated[activated.length - 2]).click();
                }
            }
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
                console.log($scope.preLoading);
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
                        label: `${fa} <span class="fjs-filename" value="${data[i].path}">${data[i].name}</span>`,
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
                    `<div class="fjs-col leaf-col"><div class="leaf-col"><div class="leaf-col-container">
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

        // File or Folder Create
        $scope.click.create = ()=> {
            let {PATH, createType, createName} = $scope;
            API.browse.create(PATH, createType, createName).then(()=> {
                $('#create').modal('hide');
                $scope.createName = '';
                reloadView();
                $timeout();
            });
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

        $scope.click.upload = function () {
            let files = $('#upload input')[0].files;
            if (files.length <= 0) return;

            $scope.event.upload({'./': $('#upload input')[0].files}).then(()=> {
                $('#upload').modal('hide');
                $('#upload input').val('');
            });
        };
    });
});