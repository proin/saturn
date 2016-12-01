'use strict';

module.exports = (server, config)=> {
    const fs = require('fs');
    const path = require('path');
    const asar = require('asar');
    const emailjs = require('emailjs');

    // class: const variables
    const MAX_LOG_SIZE = config.MAX_LOG ? config.MAX_LOG : 500;
    const MAX_HEAP = config.MAX_HEAP ? config.MAX_HEAP : 4;

    const HOME = config.home ?
        path.resolve(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], config.home)
        : path.resolve(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.node-saturn');
    const WORKSPACE_PATH = path.resolve(HOME, 'workspace');

    // class: terminal
    let terminal = (cmd, args, opts, data, err, callback)=> new Promise((resolve)=> {
        let _spawn = require('child_process').spawn;
        if (process.platform == 'win32')
            _spawn = require('cross-spawn');

        let term = _spawn(cmd, args, opts);

        term.stdout.on('data', data ? data : ()=> {
        });

        term.stderr.on('data', err ? err : ()=> {
        });

        term.on('close', () => {
            resolve();
        });

        if (callback) callback(term);
    });

    // class: Logger
    let logger = new (function () {
        const LOG_HOME = (name)=> path.join(WORKSPACE_PATH, name, 'log.json');
        let log = {};

        let read = (name)=> {
            if (!log[name] && fs.existsSync(LOG_HOME(name))) log[name] = JSON.parse(fs.readFileSync(LOG_HOME(name), 'utf-8'));
            else if (!log[name]) log[name] = {};
            return log[name];
        };

        let push = (name, target, status, message)=> {
            read(name);
            if (!log[name]) log[name] = {};
            if (!log[name][target]) log[name][target] = [];

            let logData = {status: status, target: target, message: message, ts: new Date().getTime()};
            if (status) {
                log[name][target].push(logData);
                log[name][target].splice(0, log[name][target].length - 500);
            }

            fs.writeFileSync(path.join(LOG_HOME(name)), JSON.stringify(log[name]));
            return logData;
        };

        let clear = (name, target)=> {
            if (name && target) {
                if (!log[name]) log[name] = {};
                log[name][target] = [];
            } else if (name) {
                log[name] = {};
            }
        };

        this.read = read;
        this.push = push;
        this.clear = clear;
    })();

    // class: work manager
    let manager = new (function () {
        let _status = {};
        let _proc = {};

        let getStatus = (name)=> name ? _status[name] : _status;

        this.proc = _proc;
        this.status = _status;
        this.getStatus = getStatus;
    })();

    // class: sockets
    const io = require('socket.io').listen(server);

    let sockets = new (function () {
        let list = {};

        let push = (channel, client)=> {
            if (!list[channel]) list[channel] = {};
            list[channel][client.id] = client;
        };

        let remove = (channel, client)=> {
            if (list[channel])
                delete list[channel][client.id];
        };

        let broadcast = (channel, data, all)=> {
            if (all) {
                for (let ch in list) {
                    for (let key in list[ch]) {
                        list[ch][key].send(data);
                        if (ch == channel && (manager.status[ch] == 'finish' || manager.status[ch] == 'error'))
                            delete manager.status[ch];
                    }
                }

                return;
            }

            if (list[channel])
                for (let key in list[channel])
                    list[channel][key].send(data);
        };

        this.list = list;
        this.push = push;
        this.remove = remove;
        this.broadcast = broadcast;
    })();

    let socketHandler = {};
    socketHandler.log = (client, data)=> {
        let {name} = data;
        client.send({channel: 'log', type: 'list', data: logger.read(name)});
    };

    socketHandler.status = (client)=> {
        let status = manager.getStatus();
        client.send({channel: 'status', type: 'list', data: status});
    };

    socketHandler.logclear = (client, data)=> {
        let {name} = data;
        logger.clear(name);
        client.send({channel: 'log', type: 'list', data: logger.read(name)});
    };

    io.sockets.on('connection', (client) => {
        let name = null;
        client.on('message', (data)=> {
            let {channel} = data;
            if (!name && data.name) {
                name = data.name;
                if (manager.status[name] == 'finish' || manager.status[name] == 'error')
                    delete manager.status[name];
                sockets.push(name, client);
            }

            if (socketHandler[channel])
                socketHandler[channel](client, data);
        });

        client.on('disconnect', ()=> sockets.remove(name, client))
    });

    // join logger at sockets
    logger.send = (name, target, status, message)=> {
        message = message.split('\n');

        for (let i = 0; i < message.length; i++) {
            let logData = logger.push(name, target, status, message[i]);
            sockets.broadcast(name, {channel: 'log', type: 'message', data: logData});
        }
    };

    // class: mailing
    let mailer = (type, name, target) => new Promise((resolve)=> {
        if (!config.smtp) return resolve();
        if (!config.mailingList) return resolve();
        if (!config.smtp.user) return resolve();
        if (!config.smtp.password) return resolve();
        if (!config.smtp.host) return resolve();

        if (config.mailingOn)
            if (!config.mailingOn[type])
                return resolve();

        let mail = emailjs.server.connect({
            user: config.smtp.user,
            password: config.smtp.password,
            host: config.smtp.host,
            ssl: config.smtp.ssl
        });

        let url = `${config.hostname}:${config.port}/project.html#${path}`;
        let message = '';
        if (type === 'error') message += `<h3 style="color: #e53935;">${type}</h3><code style="color: #e53935;>`;
        else if (type === 'error') message += `<h3 style="color: #f9a825;">${type}</h3><code style="color: #f9a825;>`;
        else message += `<h3>${type}</h3><pre><code style="font-size: 12px;">`;

        let log = logger.read(name)[target];
        if (!log) log = [];

        let msgCnt = 0;
        let inner = '';
        for (let i = log.length - 1; i >= 0; i--) {
            if (msgCnt > 20) break;
            if (log[i].status == 'start') break;
            if (log[i].status == 'finish') continue;
            if (log[i].status == 'install') continue;

            if (log[i].message) {
                inner = log[i].message + '<br/>' + inner;
                msgCnt++;
            }
        }

        message += inner + '</code></pre>';

        let mailFormat = fs.readFileSync(path.resolve(__dirname, '..', 'resource', 'mail-format.html'), 'utf-8');
        mailFormat = mailFormat.replace('MAILER_MESSAGE', message);
        mailFormat = mailFormat.replace('MAILER_URL', url);
        mailFormat = mailFormat.replace('MAILER_TYPE', type);

        mail.send({
            from: config.smtp.user,
            to: config.mailingList,
            subject: 'Message on Saturn - ' + type,
            text: '',
            attachment: {
                data: mailFormat,
                alternative: true
            }
        }, resolve);
    });

    // class: work manager
    manager.stop = (name)=> {
        if (manager.status[name] == 'install') return;

        if (manager.proc[name]) {
            manager.proc[name].stdin.pause();
            manager.proc[name].kill();
        }

        delete manager.status[name];
        delete manager.proc[name];
        sockets.broadcast(name, {channel: 'status', type: 'message', name: name, data: 'ready'}, true);
    };

    manager.run = (name, target)=> {
        if (manager.proc[name] || manager.status[name] == 'install') {
            sockets.broadcast(name, {channel: 'status', type: 'message', name: name, data: 'running'}, true);
            return;
        }

        manager.status[name] = 'running';
        sockets.broadcast(name, {channel: 'status', type: 'message', name: name, data: manager.status[name]}, true);

        logger.clear(name, target);
        logger.send(name, target, `start`, `start ${name}`);

        let runjs = target == 'libs' ? 'run.js' : `run-${target}.js`;
        let parg = [`--max-old-space-size=${MAX_HEAP * 1024}`, path.join(WORKSPACE_PATH, name, runjs)];
        let popt = {cwd: WORKSPACE_PATH};

        let onData = (data)=> {
            if (config.log) process.stdout.write(data);
            data = data + '';
            let warningCnt = -1;

            if (data.indexOf('[SATURN] ERROR IN') != -1) {
                manager.status[name] = 'error';
                logger.send(name, target, `error`, data);
            } else {
                data = data.split('\n');
                for (let i = 0; i < data.length; i++)
                    if (data[i] && data[i].length > 0) {
                        if (data[i].indexOf('[chartjs]') === 0) {
                            data[i] = data[i].replace('[chartjs] ', '');
                            logger.send(name, target, `chart`, data[i]);
                        } else if (data[i].indexOf('[visjs]') === 0) {
                            data[i] = data[i].replace('[visjs] ', '');
                            logger.send(name, target, `vis`, data[i]);
                        } else {
                            logger.send(name, target, `data`, data[i]);
                        }

                        if (data[i].indexOf('[SATURN] WARNING IN WORK') != -1)
                            warningCnt = 0;
                        if (warningCnt !== -1)
                            warningCnt++;
                        if (warningCnt >= 10 || i == data.length - 1) {
                            mailer('warning', name, target);
                            warningCnt = -1;
                        }
                    }
            }
        };

        let onError = (err)=> {
            if (config.log) process.stdout.write(err);
            err = err + '';
            manager.status[name] = 'error';
            logger.send(name, target, `error`, err);
        };

        let onStart = (term)=> {
            manager.proc[name] = term;
        };

        // terminal
        terminal('node', parg, popt, onData, onError, onStart).then(()=> {
            if (manager.status[name] === 'error')
                mailer('error', name, target);

            if (manager.status[name] !== 'error' && manager.status[name] != null) {
                logger.send(name, target, `finish`, `finish ${name}`);
                manager.status[name] = 'finish';
                mailer('finish', name, target);
            }

            delete manager.proc[name];

            sockets.broadcast(name, {channel: 'status', type: 'message', name: name, data: manager.status[name] ? manager.status[name] : 'ready'}, true);
        });
    };

    // class: thread modules
    let runnable = {};

    runnable.install = (libs, run_path, name)=> new Promise((resolve)=> {
        if (fs.existsSync(path.resolve(run_path, 'package.json')))
            fs.unlinkSync(path.resolve(run_path, 'package.json'));

        let DEPS_PATH = path.resolve(run_path, 'node_modules');

        let deps = ['install'];
        for (let i = 0; i < libs.length; i++)
            if (!fs.existsSync(path.resolve(DEPS_PATH, libs[i])))
                deps.push(libs[i]);

        if (deps.length == 1) return resolve();

        manager.status[name] = 'install';
        sockets.broadcast(name, {channel: 'status', type: 'install', name: name, data: libs}, true);

        terminal('npm', deps, {cwd: run_path}, ()=> null, ()=> null).then(()=> {
            delete manager.status[name];
            sockets.broadcast(name, {channel: 'status', type: 'install', name: name, data: 'finish'}, true);
            resolve();
        });
    });

    runnable.stop = (name)=> new Promise((resolve)=> {
        manager.stop(name);
        resolve();
    });

    runnable.run = (name, target)=> new Promise((resolve)=> {
        target = target && target != -1 ? target : 'libs';
        manager.run(name, target);
        resolve();
    });

    return runnable;
};