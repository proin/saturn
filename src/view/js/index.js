app.controller("ctrl", function ($scope, $timeout) {
    $scope.PATH = location.href.split('#')[1] ? JSON.parse(decodeURI(location.href.split('#')[1])) : [];
    $scope.current = [];

    $scope.createType = 'folder';
    $scope.createName = '';

    $.get('/api/list/get?read_path=' + JSON.stringify($scope.PATH), function (data) {
        $scope.current = data;
        if ($scope.PATH.length > 0)
            $scope.current.unshift({type: 'upper', name: '..'});
        $timeout();
        setInterval(function () {
            $.get('/api/list/get?read_path=' + JSON.stringify($scope.PATH), function (data) {
                for (var i = 0; i < $scope.current.length; i++)
                    if ($scope.current[i].type == 'project')
                        $scope.current[i].status = data[i].status;
                $timeout();
            });
        }, 1000);
    });

    $scope.event = {};
    $scope.status = {};
    $scope.click = {};

    $scope.click.checkall = function () {
        var checkedCnt = 0;
        for (var i = 0; i < $scope.current.length; i++)
            if ($scope.current[i].checked)
                checkedCnt++;
        for (var i = 0; i < $scope.current.length; i++)
            $scope.current[i].checked = checkedCnt != $scope.current.length
        $timeout();
    };

    $scope.click.fscheckall = function () {
        var checkedCnt = 0;
        for (var i = 0; i < $scope.fu_current.length; i++)
            if ($scope.fu_current[i].checked)
                checkedCnt++;
        for (var i = 0; i < $scope.fu_current.length; i++)
            $scope.fu_current[i].checked = checkedCnt != $scope.fu_current.length
        $timeout();
    };

    $scope.click.add = function () {
        if (!$scope.addName) return;
        location.href = '/project.html#' + $scope.addName;
    };

    $scope.click.create = function () {
        $.post('/api/file/create', {
            read_path: JSON.stringify($scope.PATH),
            filetype: $scope.createType,
            filename: $scope.createName
        }, function () {
            $.get('/api/list/get?read_path=' + JSON.stringify($scope.PATH), function (data) {
                $('#create').modal('hide');
                $scope.createName = '';
                $scope.current = data;

                $timeout();
            });
        });
    };

    $scope.click.delete = function () {
        let checked = [];
        for (var i = 0; i < $scope.current.length; i++)
            if ($scope.current[i].checked)
                checked.push($scope.current[i].path);

        $.post('/api/list/delete', {
            read_path: JSON.stringify($scope.PATH),
            rm: JSON.stringify(checked)
        }, function (data) {
            $scope.current = data;
            if ($scope.PATH.length > 0)
                $scope.current.unshift({type: 'upper', name: '..'});
            $timeout();
        });
    };

    $scope.click.upload = function () {
        if ($('#upload input')[0].files.length > 0)
            $scope.event.upload({'./': $('#upload input')[0].files}, function () {
                $('#upload').modal('hide');
                $('#upload input').val('');
            });
    };

    $scope.event.upload = function (files, callback) {
        $scope.status.uploading = true;

        var keys = [];
        for (var key in files)
            keys.push(key);

        var uploader = function (callback) {
            if (keys.length == 0) return callback();
            var key = keys.splice(0, 1)[0];

            var form = $('<form method="post"><input type="file" name="files" /></form>');
            var formData = new FormData(form);
            formData.append("dest_path", key);
            formData.append("read_path", JSON.stringify($scope.PATH));
            for (var i = 0; i < files[key].length; i++)
                formData.append("files", files[key][i]);

            $.ajax({
                url: '/api/file/upload',
                processData: false,
                contentType: false,
                data: formData,
                type: 'POST',
                success: function () {
                    uploader(callback);
                }
            });
        };

        uploader(function () {
            $.get('/api/list/get?read_path=' + JSON.stringify($scope.PATH), function (data) {
                $scope.status.uploading = false;
                $scope.current = data;
                if ($scope.PATH.length > 0)
                    $scope.current.unshift({type: 'upper', name: '..'});
                if (callback) callback();
                $timeout();
            });
        });
    };

    $scope.click.list = function (file) {
        if (file.type == 'upper') {
            $scope.PATH.splice($scope.PATH.length - 1, 1);
            $.get('/api/list/get?read_path=' + JSON.stringify($scope.PATH), function (data) {
                $scope.current = data;
                if ($scope.PATH.length > 0)
                    $scope.current.unshift({type: 'upper', name: '..'});
                $timeout();
            });
        } else if (file.type == 'folder') {
            $scope.PATH.push(file.name);
            $.get('/api/list/get?read_path=' + JSON.stringify($scope.PATH), function (data) {
                $scope.current = data;
                if ($scope.PATH.length > 0)
                    $scope.current.unshift({type: 'upper', name: '..'});
                $timeout();
            });
        } else if (file.type == 'project') {
            location.href = '/project.html#' + file.name;
        } else {
            var jsext = '.js';
            if (file.name.indexOf(jsext) == file.name.length - jsext.length)
                location.href = '/viewer.html#' + encodeURI(file.path);
        }

        location.href = '#' + JSON.stringify($scope.PATH);
    };

});