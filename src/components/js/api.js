app.factory('API', ()=> {
    'use strict';
    let factory = {};

    // LIB: API Browse
    factory.browse = {};

    factory.browse.list = (PATH)=> new Promise((resolve)=> {
        $.get('/api/browse/list?read_path=' + JSON.stringify(PATH), (data)=> {
            if (PATH.length > 0) data.unshift({type: 'upper', name: '..'});
            resolve(data);
        });
    });

    factory.browse.create = (PATH, createType, createName)=> new Promise((resolve)=> {
        $.post('/api/browse/create', {
            read_path: JSON.stringify(PATH),
            filetype: createType,
            filename: createName
        }, function () {
            $.get('/api/browse/list?read_path=' + JSON.stringify(PATH), (data)=> {
                if (PATH.length > 0) data.unshift({type: 'upper', name: '..'});
                resolve(data);
            });
        });
    });

    factory.browse.delete = (PATH, checked)=> new Promise((resolve)=> {
        $.post('/api/browse/delete', {
            read_path: JSON.stringify(PATH),
            rm: JSON.stringify(checked)
        }, function () {
            $.get('/api/browse/list?read_path=' + JSON.stringify(PATH), (data)=> {
                if (PATH.length > 0) data.unshift({type: 'upper', name: '..'});
                resolve(data);
            });
        });
    });

    factory.browse.upload = (PATH, files)=> new Promise((resolve)=> {
        var keys = [];
        for (var key in files)
            keys.push(key);

        let uploader = (callback)=> {
            if (keys.length == 0) return callback();
            var key = keys.splice(0, 1)[0];

            var form = $('<form method="post"><input type="file" name="files" /></form>');
            var formData = new FormData(form);
            formData.append("dest_path", key);
            formData.append("read_path", JSON.stringify(PATH));
            for (var i = 0; i < files[key].length; i++)
                formData.append("files", files[key][i]);

            $.ajax({
                url: '/api/browse/upload',
                processData: false,
                contentType: false,
                data: formData,
                type: 'POST',
                success: function () {
                    uploader(callback);
                }
            });
        };

        uploader(()=> {
            $.get('/api/browse/list?read_path=' + JSON.stringify(PATH), (data)=> {
                if (PATH.length > 0) data.unshift({type: 'upper', name: '..'});
                resolve(data);
            });
        });
    });

    factory.browse.read = (path)=> new Promise((resolve)=> {
        $.post('/api/browse/read', {filepath: path}, resolve);
    });

    factory.browse.save = (path, value)=> new Promise((resolve)=> {
        $.post('/api/browse/save', {filepath: path, filevalue: value}, resolve);
    });

    // LIB: API User
    factory.user = {};

    factory.user.check = ()=> new Promise((resolve)=> {
        $.get('/api/user/check', (data)=> {
            let ACCESS_STATUS = data.status;
            if (ACCESS_STATUS === 'DENIED' || ACCESS_STATUS === false) {
                if (location.href === location.protocol + '//' + location.host + '/signin.html') {
                    return;
                }
                location.href = '/signin.html';
            } else if (location.href === location.protocol + '//' + location.host + '/signin.html' && ACCESS_STATUS !== 'READONLY') {
                location.href = '/';
            }

            resolve(data);
        });
    });

    factory.user.signout = ()=> new Promise(()=> {
        $.get('/api/user/signout', function () {
            location.href = '/';
        });
    });

    factory.user.signin = (user, password)=> new Promise((resolve)=> {
        $.post('/api/user/signin', {user: user, pw: password}, (data)=> {
            if (data.status)
                location.href = '/';
            resolve(data);
        });
    });

    // LIB: Script
    factory.script = {};

    factory.script.load = (path)=> new Promise((resolve)=> {
        $.get('/api/script/load?path=' + encodeURI(path), resolve);
    });

    factory.script.log = (path)=> new Promise((resolve)=> {
        $.get('/api/script/log?path=' + encodeURI(path), resolve);
    });

    factory.script.rename = (path, rename)=> new Promise((resolve)=> {
        $.post('/api/script/rename', {filepath: path, rename: rename}, function (result) {
            if (result.status) {
                location.href = '/project.html#' + encodeURI(result.path);
                location.reload();
                return;
            }
            resolve();
        });
    });

    factory.script.save = (runnable)=> new Promise((resolve)=> {
        $.post('/api/script/save', runnable, resolve);
    });

    factory.script.run = (runnable)=> new Promise(()=> {
        $.post('/api/script/run', runnable);
    });

    factory.script.runSingle = (runnable)=> new Promise(()=> {
        $.post('/api/script/run-single', runnable);
    });

    factory.script.stop = (path)=> new Promise(()=> {
        $.get('/api/script/stop?runpath=' + path);
    });

    return factory;
});