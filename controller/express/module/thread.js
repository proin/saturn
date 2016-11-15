'use strict';

module.exports = ()=> {
    const fs = require('fs');
    const path = require('path');
    const asar = require('asar');
    const MAX_LOG_SIZE = 500;
    const psTree = require('ps-tree');

    let kill = function (pid, signal, callback) {
        signal = signal || 'SIGKILL';
        callback = callback || function () {
            };
        var killTree = true;
        if (killTree) {
            psTree(pid, function (err, children) {
                [pid].concat(
                    children.map(function (p) {
                        return p.PID;
                    })
                ).forEach(function (tpid) {
                    try {
                        process.kill(tpid, signal)
                    }
                    catch (ex) {
                    }
                });
                callback();
            });
        } else {
            try {
                process.kill(pid, signal)
            }
            catch (ex) {
            }
            callback();
        }
    };

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

    runnable.run = (name)=> new Promise((resolve)=> {
        if (runnable.status[name]) return resolve();

        let run_terminal = (cmd, args, opts, data, err)=> new Promise((resolve)=> {
            const _spawn = require('child_process').spawn;
            let term = _spawn(cmd, args, opts);
            term.stdout.on('data', data ? data : ()=> {
            });

            term.stderr.on('data', err ? err : ()=> {
            });

            term.on('close', () => {
                resolve();
            });

            runnable.proc[name] = term;
        });

        let WORKSPACE_PATH = path.resolve(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.flowpipe', 'workspace');
        if (!runnable.log[name]) runnable.log[name] = [];
        runnable.log[name].push({module: `${name}`, status: `start`});
        runnable.status[name] = true;

        run_terminal('node', [path.resolve(WORKSPACE_PATH, `${name}.flp`, 'run.js')], {cwd: WORKSPACE_PATH}, (data)=> {
            data = data + '';
            data = data.trim();
            if (!runnable.log[name]) runnable.log[name] = [];
            runnable.log[name].push({module: `${name}`, status: 'data', msg: data});
            if (runnable.log[name].length > MAX_LOG_SIZE) runnable.log[name].splice(0, runnable.log[name].length - MAX_LOG_SIZE);
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
        let DEPS_PATH = path.resolve(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.flowpipe', 'workspace', 'node_modules');
        let deps = ['install', '--save'];
        for (let i = 0; i < libs.length; i++)
            if (!fs.existsSync(path.resolve(DEPS_PATH, libs[i])))
                deps.push(libs[i]);
        if (deps.length == 2) return resolve();
        terminal('npm', deps, {cwd: run_path}, ()=> null, ()=> null).then(resolve);
    });

    return runnable;
};