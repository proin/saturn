'use strict';
const express = require("express");
const router = express.Router();
const path = require('path');

router.get("/", function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    // class: terminal
    let terminal = (cmd, args, resolve, opts)=> {
        let _spawn = require('child_process').spawn;
        if (process.platform == 'win32')
            _spawn = require('cross-spawn');
        let term = _spawn(cmd, args, opts);

        let resultData = '';
        term.stdout.on('data', (data) => {
            process.stdout.write(data + '');
            resultData += data + '\n';
        });

        term.on('close', () => {
            resolve(resultData);
        });
    };

    if (req.modules.thread.update !== true) {
        req.modules.thread.update = true;

        terminal('git', ['pull'], (resultData)=> {
            if (resultData.indexOf('Already up-to-date') !== -1) {
                setTimeout(()=> {
                    delete req.modules.thread.update;
                }, 3000);
                return;
            }

            terminal('lwot', ['install'], ()=> {
                terminal('bower', ['install'], ()=> {
                    terminal('lwot', ['build'], ()=> {
                        req.modules.thread.update = false;
                        for (let key in req.modules.thread.manager.proc)
                            req.modules.thread.stop(key);
                        process.exit();
                    });
                });
            });
        });
    }

    res.send(req.static.updateHtml);
});

module.exports = router;