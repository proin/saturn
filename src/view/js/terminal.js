app.controller("ctrl", function ($scope, $timeout, API) {
    $scope.preLoading = true;

    API.user.check().then((ACCESS_INFO)=> {
        if (ACCESS_INFO.status !== 'GRANTALL') {
            location.href = '/signin.html';
            return;
        }

        $scope.ACCESS_STATUS = ACCESS_INFO.status;
        $scope.ACCESS_POLICY = ACCESS_INFO.policy;

        var socket = io.connect();
        socket.on('connect', function () {
            var term = new Terminal({
                cols: 150,
                rows: 40,
                screenKeys: true
            });

            term.on('data', function (data) {
                socket.emit('data', data);
            });

            term.open(document.getElementById('terminal'));

            socket.on('data', function (data) {
                term.write(data);
            });

            socket.on('disconnect', function () {
                term.destroy();
            });
        });

        $scope.preLoading = false;
        $timeout();
    });
});