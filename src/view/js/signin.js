app.controller("ctrl", function ($scope) {
    $scope.signin = function () {
        $.post('/api/user/signin', {user: $scope.user, pw: $scope.password}, function (data) {
            if (data.status) {
                location.href = '/';
            }
        })
    };
});