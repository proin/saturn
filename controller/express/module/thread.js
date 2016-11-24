'use strict';

module.exports = (server, config)=> {
    const fs = require('fs');
    const path = require('path');
    const asar = require('asar');
    const MAX_LOG_SIZE = config.MAX_LOG ? config.MAX_LOG : 500;
    const MAX_HEAP = config.MAX_HEAP ? config.MAX_HEAP : 4;
    const emailjs = require('emailjs');

    let mailer = (type, path) => new Promise((resolve)=> {
        if (!config.smtp) return resolve();
        if (!config.mailingList) return resolve();
        if (!config.smtp.user) return resolve();
        if (!config.smtp.password) return resolve();
        if (!config.smtp.host) return resolve();

        if (config.mailingOn) {
            if (!config.mailingOn[type]) {
                return resolve();
            }
        }

        let mail = emailjs.server.connect({
            user: config.smtp.user,
            password: config.smtp.password,
            host: config.smtp.host,
            ssl: config.smtp.ssl
        });

        let url = `${config.hostname}:${config.port}/project.html#${path}`;
        let message = '';
        if (type === 'error') message += `<h3 style="color: #e53935;">${type}</h3><div style="color: #e53935;>`;
        else message += `<h3>${type}</h3><div>`;

        if (runnable.log[path])
            for (let i = 0; i < runnable.log[path].length; i++) {
                if (i > 10) break;
                if (runnable.log[path][i].msg && runnable.log[path][i].status !== 'install') {
                    message += runnable.log[path][i].msg + '<br/>';
                }
            }

        message += '</div>';

        let mailFormat = '<table border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background-color: #f6f6f6;" width="100%" bgcolor="#f6f6f6"> <tr> <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td><td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; Margin: 0 auto !important; max-width: 580px; padding: 10px; width: 580px;" width="580" valign="top"> <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;"> <table class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background: #fff; border-radius: 3px;" width="100%"> <tr> <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top"> <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;" width="100%"> <tr> <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top"> <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0;">Hi there,</p><p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0;">Alert on your work. (WORKSPACE_STATUS_TYPE)</p><table border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="margin: 16px 0; border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; box-sizing: border-box;" width="100%"> <tr><td style="font-family: sans-serif; font-size: 14px; vertical-align: top; background-color: #3498db; border-radius: 5px; text-align: center;" valign="top" bgcolor="#3498db" align="center"><a href="WORKSPACE_URL" target="_blank" style="width: 100%; display: inline-block; color: #ffffff; background-color: #3498db; border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 0; padding: 6px; text-transform: capitalize; border-color: #3498db;">Go to Work</a></td></tr></table> <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 15px;">Good luck! Hope it works.</p><hr/> WORKSPACE_MESSAGE </td></tr></table> </td></tr></table> <div class="footer" style="clear: both; padding-top: 10px; text-align: center; width: 100%;"> <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;" width="100%"> <tr> <td class="content-block powered-by" style="font-family: sans-serif; vertical-align: top; padding-top: 10px; padding-bottom: 10px; font-size: 12px; color: #999999; text-align: center;" valign="top" align="center"> Powered by <a href="https://github.com/proin/saturn" target="_blank" style="color: #999999; font-size: 12px; text-align: center; text-decoration: none;">Saturn</a>. </td></tr></table> </div></div></td></tr></table>';
        mailFormat = mailFormat.replace('WORKSPACE_URL', url);
        mailFormat = mailFormat.replace('WORKSPACE_STATUS_TYPE', type);
        mailFormat = mailFormat.replace('WORKSPACE_MESSAGE', message);

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

    let terminal = (cmd, args, opts, data, err)=> new Promise((resolve)=> {
        let _spawn = require('child_process').spawn;
        if (process.platform == 'win32') _spawn = require('cross-spawn');
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
            runnable.status[name] = null;
            delete runnable.proc[name];
        }

        resolve();
    });

    runnable.run = (name, isSingle)=> new Promise((resolve)=> {
        if (runnable.status[name] === 'running') return resolve();

        let run_terminal = (cmd, args, opts, data, err)=> new Promise((resolve)=> {
            let _spawn = require('child_process').spawn;
            if (process.platform == 'win32') _spawn = require('cross-spawn');

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
        runnable.status[name] = 'running';

        run_terminal('node', [`--max-old-space-size=${MAX_HEAP * 1024}`, path.join(WORKSPACE_PATH, name, isSingle ? 'run-instance.js' : 'run.js')], {cwd: WORKSPACE_PATH}, (data)=> {
            data = data + '';
            if (data.indexOf('[app] ERROR IN') != -1) {
                runnable.status[name] = 'error';
                runnable.log[name].push({module: `${name}`, status: 'data', msg: data});
            } else {
                data = data.split('\n');

                for (var i = 0; i < data.length; i++) {
                    data[i] = data[i].trim();
                    if (data[i] && data[i].length > 0) {
                        if (!runnable.log[name]) runnable.log[name] = [];
                        runnable.log[name].push({module: `${name}`, status: 'data', msg: data[i]});
                        if (runnable.log[name].length > MAX_LOG_SIZE) runnable.log[name].splice(0, runnable.log[name].length - MAX_LOG_SIZE);
                    }
                }
            }
        }, (err)=> {
            err = err + '';
            err = err.trim();
            if (!runnable.log[name]) runnable.log[name] = [];
            runnable.log[name].push({module: `${name}`, status: 'error', msg: err});
            runnable.status[name] = 'error';
            if (runnable.log[name].length > MAX_LOG_SIZE) runnable.log[name].splice(0, runnable.log[name].length - MAX_LOG_SIZE);
        }).then(()=> {
            if (!runnable.log[name]) runnable.log[name] = [];
            runnable.log[name].push({module: `${name}`, status: `finish`});
            if (runnable.log[name].length > MAX_LOG_SIZE) runnable.log[name].splice(0, runnable.log[name].length - MAX_LOG_SIZE);

            if (runnable.status[name] === 'error') mailer('error', name);

            if (runnable.status[name] !== 'error' && runnable.status[name] != null) {
                runnable.status[name] = 'finish';
                mailer('finish', name);
            }

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