app.controller("ctrl", function ($scope, $timeout, API) {
    API.user.check().then((ACCESS_INFO)=> {
        $scope.ACCESS_STATUS = ACCESS_INFO.status;

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

        $scope.status = {};
        $scope.status.lastSaved = new Date().format('yyyy-MM-dd HH:mm:ss');
        $scope.click = {};
        $scope.click.save = function () {
            API.browse.save($scope.file, $scope.value).then((data)=> {
                if (data.status) {
                    $scope.status.lastSaved = new Date().format('yyyy-MM-dd HH:mm:ss');
                    $timeout();
                }
            });
        };
    });
});