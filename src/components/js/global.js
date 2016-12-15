window.globalScope = ($scope, $timeout, API)=> {
    $scope.event = {};
    $scope.click = {};
    $scope.status = {};

    $scope.status.finder = {};
    $scope.status.finder.createType = 'project';
    $scope.status.finder.createName = 'new';
    $scope.status.finder.selectedDir = '/';

    // Signout
    $scope.click.signout = API.user.signout;

    $scope.click.finder = {};

    // class: alert
    $scope.alert = {};
    $scope.alert.message = '';
    $scope.alert.show = function (message) {
        $scope.alert.message = message;
        $('#alert').modal('show');
        $timeout();
    };
};