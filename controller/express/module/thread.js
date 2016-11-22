'use strict';

module.exports = (server, config)=> {
    const fs = require('fs');
    const path = require('path');
    const asar = require('asar');
    const MAX_LOG_SIZE = config.MAX_LOG ? config.MAX_LOG : 500;
    const MAX_HEAP = config.MAX_HEAP ? config.MAX_HEAP : 4;

    let terminal = (cmd, args, opts, data, err)=> new Promise((resolve)=> {
        const _spawn = require('child_process').spawn;
        let term = _spawn(cmd, args, opts);

        term.stdout.on('data', data ? data : ()=> {
        });

        term.stderr.on('data', err ? err : ()=> {
        });

        term.on('close', () => {
            resolve();
        });
    });

    let runnable = {};

    runnable.log = {};
    runnable.status = {};
    runnable.proc = {};

    runnable.stop = (name)=> new Promise((resolve)=> {
        if (runnable.proc[name]) {
            runnable.proc[name].stdin.pause();
            runnable.proc[name].kill();

            runnable.log[name].push({module: `${name}`, status: `force stop`});
            if (runnable.log[name].length > MAX_LOG_SIZE) runnable.log[name].splice(0, runnable.log[name].length - MAX_LOG_SIZE);
            runnable.status[name] = false;
            delete runnable.proc[name];
        }

        resolve();
    });

    runnable.run = (name, isSingle)=> new Promise((resolve)=> {
        if (runnable.status[name]) return resolve();

        let run_terminal = (cmd, args, opts, data, err)=> new Promise((resolve)=> {
            const _spawn = require('child_process').spawn;
            let term = _spawn(cmd, args, opts);
            term.stdout.on('data', (log)=> {
                if (config.log)
                    process.stdout.write(log);
                if (data) data(log);

            });

            term.stderr.on('data', (log)=> {
                if (config.log)
                    process.stdout.write(log);
                if (err) err(log);
            });

            term.on('close', () => {
                resolve();
            });

            runnable.proc[name] = term;
        });

        let USERHOME = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

        if (config.HOME) USERHOME = path.resolve(USERHOME, config.HOME);
        else if (config.home) USERHOME = path.resolve(USERHOME, config.home);
        else USERHOME = path.resolve(USERHOME, '.node-saturn');
        let WORKSPACE_PATH = path.resolve(USERHOME, 'workspace');

        if (!runnable.log[name]) runnable.log[name] = [];
        runnable.log[name].push({module: `${name}`, status: `start`});
        runnable.status[name] = true;

        run_terminal('node', [`--max-old-space-size=${MAX_HEAP * 1024}`, path.join(WORKSPACE_PATH, name, isSingle ? 'run-instance.js' : 'run.js')], {cwd: WORKSPACE_PATH}, (data)=> {
            data = data + '';
            data = data.split('\n');

            for (var i = 0; i < data.length; i++) {
                data[i] = data[i].trim();
                if (data[i] && data[i].length > 0) {
                    if (!runnable.log[name]) runnable.log[name] = [];
                    runnable.log[name].push({module: `${name}`, status: 'data', msg: data[i]});
                    if (runnable.log[name].length > MAX_LOG_SIZE) runnable.log[name].splice(0, runnable.log[name].length - MAX_LOG_SIZE);
                }
            }
        }, (err)=> {
            err = err + '';
            err = err.trim();
            if (!runnable.log[name]) runnable.log[name] = [];
            runnable.log[name].push({module: `${name}`, status: 'error', msg: err});
            if (runnable.log[name].length > MAX_LOG_SIZE) runnable.log[name].splice(0, runnable.log[name].length - MAX_LOG_SIZE);
        }).then(()=> {
            if (!runnable.log[name]) runnable.log[name] = [];
            runnable.log[name].push({module: `${name}`, status: `finish`});
            if (runnable.log[name].length > MAX_LOG_SIZE) runnable.log[name].splice(0, runnable.log[name].length - MAX_LOG_SIZE);
            runnable.status[name] = false;
            delete runnable.proc[name];
        });
        resolve();
    });

    runnable.install = (libs, run_path)=> new Promise((resolve)=> {
        let DEPS_PATH = path.resolve(run_path, 'node_modules'
);

        let deps = ['install', '--save'];
        for (let i = 0; i < libs.length; i++)
            if (!fs.existsSync(path.resolve(DEPS_PATH, libs[i])))
                deps.push(libs[i]);
        if (deps.length == 2) return resolve();

        terminal('npm', deps, {cwd: run_path}, ()=> null, ()=> null).then(()=> {
            resolve();
        });
    });

    return runnable;
};