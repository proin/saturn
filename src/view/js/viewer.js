app.controller("ctrl", function ($scope, $timeout) {
    while (ACCESS_STATUS === 'LOADING') {
    }
    $scope.ACCESS_STATUS = ACCESS_STATUS;

    $scope.file = location.href.split('#')[1];

    $scope.value = '';

    $scope.history = function () {
        window.history.back();
    };

    $.post('/api/file/read', {filepath: $scope.file}, function (data) {
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
            readOnly: ACCESS_STATUS !== 'GRANTALL',
            mode: "javascript"
        }).on('change', function (e) {
            var changeValue = e.getValue();
            $scope.value = changeValue;
        });
        $timeout();
    });

    $scope.click = {};
    $scope.click.save = function () {
        $.post('/api/file/save', {filepath: $scope.file, filevalue: $scope.value}, function () {
            $timeout();
        });
    };
});