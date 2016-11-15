'use strict';

module.exports = (server, config)=> {
    const spawn = require('child_process').spawn;

    let terminal = (cmd, args, opts, data, err)=> new Promise((resolve)=> {
        let term = spawn(cmd, args, opts);

        term.stdout.on('data', data);

        term.stderr.on('data', err);

        term.on('close', () => {
            resolve();
        });
    });

    var io = require('socket.io').listen(server);

    let socket = null;
    io.sockets.on('connection', (client) => {
        socket = client;
        client.on('message', function (message) {
            client.send('response');
        });

        client.on('disconnect', function () {
        });
    });

    return socket;
};