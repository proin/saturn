app.controller("ctrl", function ($scope, $timeout, API) {
    API.user.check().then((ACCESS_INFO)=> {
        $scope.ACCESS_STATUS = ACCESS_INFO.status;
        $scope.ACCESS_POLICY = ACCESS_INFO.policy;

        // Function
        $scope.event = {};
        $scope.click = {};

        // Variables
        $scope.status = {};

        let PATH = location.href.split('#')[1] ? decodeURI(location.href.split('#')[1]) : '';
        $scope.PATH = PATH.split('/');
        $scope.PATH.splice(0, 1);

        $scope.current = [];
        $scope.createType = 'folder';
        $scope.createName = '';

        // Load and Update List
        API.browse.list($scope.PATH).then((data)=> {
            if (data.status !== false) $scope.current = data;
            $timeout();
        });

        setInterval(function () {
            API.browse.list($scope.PATH).then((data)=> {
                for (var i = 0; i < $scope.current.length; i++)
                    if ($scope.current[i].type == 'project') $scope.current[i].status = data[i].status;
                $timeout();
            });
        }, 1000);

        // Check All
        $scope.click.checkall = function () {
            var checkedCnt = 0;
            for (var i = 0; i < $scope.current.length; i++)
                if ($scope.current[i].checked)
                    checkedCnt++;
            for (var i = 0; i < $scope.current.length; i++)
                $scope.current[i].checked = checkedCnt != $scope.current.length
            $timeout();
        };

        // Add Project
        $scope.click.add = function () {
            let {addName, PATH} = $scope;
            if (!addName) return;
            location.href = `/project.html#${encodeURI(addName)}#${encodeURI(JSON.stringify(PATH))}`;
        };

        // Signout
        $scope.click.signout = API.user.signout;

        // File or Folder Create
        $scope.click.create = ()=> {
            let {PATH, createType, createName} = $scope;
            API.browse.create(PATH, createType, createName).then((data)=> {
                $('#create').modal('hide');
                $scope.createName = '';
                $scope.current = data;
                $timeout();
            });
        };

        // Delete Files
        $scope.click.delete = function () {
            let {PATH, current} = $scope;

            let checked = [];
            for (var i = 0; i < current.length; i++)
                if (current[i].checked)
                    checked.push(current[i].path);

            API.browse.delete(PATH, checked).then((data)=> {
                $scope.current = data;
                $timeout();
            });
        };

        // Upload Files
        $scope.event.upload = (files)=> new Promise((resolve)=> {
            let {PATH} = $scope;
            $scope.status.uploading = true;

            API.browse.upload(PATH, files).then((data)=> {
                $scope.status.uploading = false;
                $scope.current = data;
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

        // click list item
        $scope.click.list = function (file) {
            if (file.type == 'upper') {
                $scope.PATH.splice($scope.PATH.length - 1, 1);
                file.path = '';
                for (let i = 0; i < $scope.PATH.length; i++)
                    file.path += '/' + $scope.PATH[i];
            } else if (file.type == 'folder') {
                $scope.PATH.push(file.name);
            } else if (file.type == 'project') {
                location.href = `/project.html#${encodeURI(file.path)}`;
                return;
            } else {
                var jsext = '.js';
                if (file.name.indexOf(jsext) == file.name.length - jsext.length) {
                    location.href = '/viewer.html#' + encodeURI(file.path);
                } else {
                    window.open('/api/browse/download?filepath=' + encodeURI(file.path), '_blank');
                }
                return;
            }

            location.href = `#${encodeURI(file.path)}`;

            API.browse.list($scope.PATH).then((data)=> {
                if (data.status !== false) $scope.current = data;
                $timeout();
            });
        };
    });
});