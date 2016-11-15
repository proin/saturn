'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');
const asar = require('asar');

router.post("/", function (req, res) {
    let {name, lib, scripts, target} = req.body;

    if (!name) return res.send({err: new Error('not defined name')});

    const WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;
    const TMP_PATH = path.resolve(WORKSPACE_PATH, `${name}.flp`);

    if (!fs.existsSync(WORKSPACE_PATH)) fsext.mkdirsSync(WORKSPACE_PATH);
    if (!fs.existsSync(path.resolve(WORKSPACE_PATH, 'package.json'))) fs.writeFileSync(path.resolve(WORKSPACE_PATH, 'package.json'), '{}');

    fsext.removeSync(path.resolve(TMP_PATH));
    fsext.mkdirsSync(path.resolve(TMP_PATH, 'scripts'));

    lib = JSON.parse(lib);
    scripts = JSON.parse(scripts);

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

        if (fs.existsSync(path.resolve(WORKSPACE_PATH, 'node_modules'))) {
            list = fs.readdirSync(path.resolve(WORKSPACE_PATH, 'node_modules'));
            for (let j = 0; j < list.length; j++)
                if (list[j] == npms[i])
                    exists = true;
        }

        npmlibs.push(npms[i]);
    }

    fs.writeFileSync(path.resolve(TMP_PATH, 'scripts.json'), JSON.stringify(scripts));
    fs.writeFileSync(path.resolve(TMP_PATH, 'lib.json'), JSON.stringify(lib));

    let runjs = `'use strict';\n`;
    runjs += `const Flowpipe = require('Flowpipe');\n`;
    runjs += `let flowpipe = Flowpipe.instance('app');\n`;

    let runInsert = {};
    for (let i = 0; i < scripts.length; i++)
        if (scripts[i].type == 'loop')
            runInsert[scripts[i].block_end] = {start: i + 1, end: scripts[i].block_end, condition: scripts[i].value};

    for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].type == 'work') {
            let jsm = '';
            jsm += `module.exports = (args)=> new Promise((resolve)=> {\n`;
            jsm += lib.value + '\n';
            jsm += `${scripts[i].value}\n`;

            if (jsm.indexOf('resolve()') == -1)
                jsm += `resolve();\n`;
            jsm += `});\n`;
            fs.writeFileSync(path.resolve(TMP_PATH, 'scripts', `script-${i}.js`), jsm);

            runjs += `flowpipe.then('${i}', require('${path.resolve(TMP_PATH, 'scripts', `script-${i}.js`)}'));\n`;

            if (runInsert[i])
                runjs += `flowpipe.loop('${runInsert[i].start}', (args)=> ${runInsert[i].condition.replace(';', '')});\n`
        }
    }

    runjs += `flowpipe.run()\n`;

    fs.writeFileSync(path.resolve(TMP_PATH, 'run.js'), runjs);

    res.send({status: true});
});

module.exports = router;