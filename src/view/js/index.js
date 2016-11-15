app.controller("ctrl", function ($scope, $timeout) {
    $scope.PATH = [];
    $scope.current = [];

    $scope.FU_PATH = [];
    $scope.fu_current = [];

    $.get('/api/list/get?read_path=' + JSON.stringify($scope.PATH), function (data) {
        $scope.current = data;
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

    $.get('/api/file/get?read_path=' + JSON.stringify($scope.FU_PATH), function (data) {
        $scope.fu_current = data;
        $timeout();
    });

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
        let checked = [];
        for (var i = 0; i < $scope.fu_current.length; i++)
            if ($scope.fu_current[i].checked)
                checked.push($scope.fu_current[i].path);
        $.post('/api/file/upload', {
            read_path: JSON.stringify($scope.PATH),
            files: JSON.stringify(checked)
        }, function () {
            $.get('/api/list/get?read_path=' + JSON.stringify($scope.PATH), function (data) {
                $scope.click.fscheckall();
                $scope.click.fscheckall();
                $('#upload').modal('hide');
                $scope.current = data;
                $timeout();
            });
        });
    };

    $scope.click.fileList = function (file) {
        if (file.type == 'upper') {
            $scope.FU_PATH.splice($scope.FU_PATH.length - 1, 1);
            $.get('/api/file/get?read_path=' + JSON.stringify($scope.FU_PATH), function (data) {
                $scope.fu_current = data;
                if ($scope.FU_PATH.length > 0)
                    $scope.fu_current.unshift({type: 'upper', name: '..'});
                $timeout();
            });
        } else if (file.type == 'folder') {
            $scope.FU_PATH.push(file.name);
            $.get('/api/file/get?read_path=' + JSON.stringify($scope.FU_PATH), function (data) {
                $scope.fu_current = data;
                if ($scope.FU_PATH.length > 0)
                    $scope.fu_current.unshift({type: 'upper', name: '..'});
                $timeout();
            });
        }
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
            // TODO download
        }
    };

});