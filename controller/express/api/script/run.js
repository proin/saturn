'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.post("/", function (req, res) {
    let {thread} = req.modules;
    let {name, lib} = req.body;
    if (!name) return res.send({err: new Error('not defined name')});

    const WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;
    const TMP_PATH = path.resolve(WORKSPACE_PATH, `${name}.satbook`);

    let args = req.body;
    args.WORKSPACE_PATH = WORKSPACE_PATH;
    args.TMP_PATH = TMP_PATH;

    req.saturn.workspace.save(args)
        .then(()=> {
            if (!thread.log[name]) thread.log[name] = [];
            thread.log[name].push({module: `${name}`, status: `data`, msg: `installing dependencies...`});
            thread.status[name] = true;

            lib = JSON.parse(lib);

            let npmlibs = ['flowpipe'];
            let npms = lib.value.match(/require\([^\)]+\)/gim);

            for (let i = 0; i < npms.length; i++) {
                npms[i] = npms[i].replace(/ /gim, '');
                npms[i] = npms[i].replace(/\n/gim, '');
                npms[i] = npms[i].replace(/\t/gim, '');
                npms[i] = npms[i].replace("require('", '');
                npms[i] = npms[i].replace("')", '');

                let exists = true;
                try {
                    require(npms[i]);
                } catch (e) {
                    exists = false;
                }

                let list = fs.readdirSync(path.resolve(__dirname, '..', '..', '..', 'node_modules'));
                for (let j = 0; j < list.length; j++)
                    if (list[j] == npms[i])
                        exists = false;

                if (fs.existsSync(path.resolve(WORKSPACE_PATH, npms[i]))) {
                    exists = true;
                }

                if (fs.existsSync(path.resolve(WORKSPACE_PATH, 'node_modules'))) {
                    list = fs.readdirSync(path.resolve(WORKSPACE_PATH, 'node_modules'));
                    for (let j = 0; j < list.length; j++)
                        if (list[j] == npms[i])
                            exists = true;
                }

                if (!exists)
                    npmlibs.push(npms[i]);
            }

            return thread.install(npmlibs, WORKSPACE_PATH);
        }).then(()=> {
            thread.log[name].push({module: `${name}`, status: `data`, msg: `installed dependencies...`});
            thread.status[name] = false;
            return thread.run(name);
        })
        .then(()=> {
            res.send({status: true});
        });
});

module.exports = router;