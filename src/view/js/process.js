app.controller("ctrl", function ($scope, $timeout, API) {
    $scope.preLoading = true;

    $scope.current_time = new Date().getTime();

    setInterval(()=> {
        $scope.current_time = new Date().getTime();
        $timeout();
    }, 1000);

    API.user.check().then((ACCESS_INFO)=> {
        if (ACCESS_INFO.status !== 'GRANTALL') {
            location.href = '/signin.html';
            return;
        }

        $scope.ACCESS_STATUS = ACCESS_INFO.status;
        $scope.ACCESS_POLICY = ACCESS_INFO.policy;

        $scope.preLoading = false;
        $timeout();

        $scope.PATH = '/';
        $scope.ROOT_PATH = `/`;

        globalScope($scope, $timeout, API);

        // class: file
        $scope.file = location.href.split('#')[1];

        $scope.value = '';

        $scope.click.list = ()=> {
            $('.finder-view').toggleClass('fixed');
        };

        // Class: Finder
        finderTree($scope, $timeout, API);

        $scope.click.stop = (item)=> {
            API.script.stop(item.path).then(()=> {
                item.status = 'stop';
                $timeout();
            });
        };

        $scope.process = [];

        API.script.running().then((data)=> {
            $scope.process = [];
            for (let key in data) {
                let item = data[key];
                item.running_time = (new Date().getTime() - item.time) / 1000;
                $scope.process.push(data[key]);
            }

            $timeout();
        });
    });
});