app.controller("ctrl", function ($scope, API) {
    $scope.signin = function () {
        let {user, password} = $scope;
        API.user.signin(user, password);
    };
});