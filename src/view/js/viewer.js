app.controller("ctrl", function ($scope, $timeout, API) {
    API.user.check().then((ACCESS_INFO)=> {
        $scope.ACCESS_STATUS = ACCESS_INFO.status;
        $scope.ACCESS_POLICY = ACCESS_INFO.policy;

        let PATH = decodeURI(location.href.split('#')[1]);
        let EXT = PATH.split('.');
        EXT = EXT[EXT.length - 1];

        $scope.PATH = PATH;
        $scope.ROOT_PATH = `/`;

        globalScope($scope, $timeout, API);

        // class: socket
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

        $scope.click.list = ()=> {
            $('.finder-view').toggleClass('fixed');
        };

        $scope.history = function () {
            let PATH = $scope.PATH.split('/');
            PATH.splice(0, 1);
            PATH.splice(PATH.length - 1, 1);
            let path = '';
            for (let i = 0; i < PATH.length; i++)
                path += '/' + PATH[i];
            location.href = `/#${encodeURI(path)}`;
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
            if (EXT.toLowerCase() == 'py') codeMode = 'text/x-cython';

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

        // Class: Finder
        finderTree($scope, $timeout, API);
    });
});