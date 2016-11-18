'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const path = require('path');
const asar = require('asar');
const zip = new require('node-zip')();

router.get("/", function (req, res) {
    // allow for everyone
    if (req.user.check() === 'DENIED') return;

    let {name} = req.query;

    if (!name) return res.send({err: new Error('not defined name')});

    const PRJ_PATH = path.resolve(req.DIR.WORKSPACE_PATH, `${name}.satbook`);
    const LIB_PATH = path.resolve(PRJ_PATH, 'lib.json');
    const SCRIPTS_PATH = path.resolve(PRJ_PATH, 'scripts.json');
    const WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;

    const TMP_PATH = path.resolve(WORKSPACE_PATH, `${name}.satbook`);

    if (!fs.existsSync(LIB_PATH)) return res.send({err: new Error('no work')});
    if (!fs.existsSync(SCRIPTS_PATH)) return res.send({err: new Error('no work')});

    let lib = JSON.parse(fs.readFileSync(LIB_PATH, 'utf-8'));
    let scripts = JSON.parse(fs.readFileSync(SCRIPTS_PATH, 'utf-8'));

    let packageJSON = {dependencies: {flowpipe: ''}};
    packageJSON.name = name;

    let npmlibs = ['flowpipe'];
    let npms = lib.value.match(/require\([^\)]+\)/gim);
    for (let i = 0; i < npms.length; i++) {
        npms[i] = npms[i].replace(/ /gim, '');
        npms[i] = npms[i].replace(/\n/gim, '');
        npms[i] = npms[i].replace(/\t/gim, '');
        npms[i] = npms[i].replace("require('", '');
        npms[i] = npms[i].replace("')", '');

        let localModule = false;
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
            localModule = true;
        }

        if (fs.existsSync(path.resolve(WORKSPACE_PATH, 'node_modules'))) {
            list = fs.readdirSync(path.resolve(WORKSPACE_PATH, 'node_modules'));
            for (let j = 0; j < list.length; j++)
                if (list[j] == npms[i]) {
                    try {
                        let pj = JSON.parse(fs.readFileSync(path.resolve(WORKSPACE_PATH, 'node_modules', npms[i], 'package.json'), 'utf-8'));
                        packageJSON.dependencies[npms[i]] = pj.version ? pj.version : '';
                    } catch (e) {
                    }
                    exists = true;
                }
        }

        if (exists && localModule === true) {
            zip.file(path.basename(path.resolve(WORKSPACE_PATH, npms[i])), fs.readFileSync(path.resolve(WORKSPACE_PATH, npms[i]), 'utf-8'));
            npms[i] = path.basename(path.resolve(WORKSPACE_PATH, npms[i]));
        }
    }

    // runjs
    let libVal = lib.value;
    let requirestr = libVal.match(/require\([^\)]+\)/gim);
    for (let i = 0; i < requirestr.length; i++) {
        requirestr[i] = requirestr[i].replace(/ /gim, '');
        requirestr[i] = requirestr[i].replace(/\n/gim, '');
        requirestr[i] = requirestr[i].replace(/\t/gim, '');
        requirestr[i] = requirestr[i].replace("require('", '');
        requirestr[i] = requirestr[i].replace("')", '');
        if (fs.existsSync(path.resolve(WORKSPACE_PATH, requirestr[i])))
            lib.value = lib.value.replace(requirestr[i], './' + path.basename(requirestr[i]));
    }

    let runjs = lib.value + '\n';
    runjs += `const Flowpipe = require('flowpipe');\n`;
    runjs += `let flowpipe = Flowpipe.instance('app');\n`;

    let runInsert = {};
    for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].type == 'loop') {
            let start = i + 1;
            for (let j = i + 1; j < scripts.length; j++) {
                if (scripts[j].type != 'loop') {
                    start = j;
                    break;
                }
            }
            if (!runInsert[scripts[i].block_end]) runInsert[scripts[i].block_end] = [];
            runInsert[scripts[i].block_end].unshift({start: start, end: scripts[i].block_end, condition: scripts[i].value});
        }
    }

    for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].type == 'work') {
            let jsm = '';
            jsm += `(args)=> new Promise((resolve)=> {\n`;
            jsm += `${scripts[i].value}\n`;

            if (jsm.indexOf('resolve()') == -1)
                jsm += `resolve();\n`;
            jsm += `})\n`;

            fs.writeFileSync(path.resolve(TMP_PATH, 'scripts', `script-${i}.js`), jsm);

            runjs += `flowpipe.then('${i}', ${jsm});\n`;

            if (runInsert[i])
                for (let j = 0; j < runInsert[i].length; j++)
                    runjs += `flowpipe.loop('${runInsert[i][j].start}', (args)=> ${runInsert[i][j].condition.replace(';', '')});\n`
        }
    }

    runjs += `flowpipe.run()\n`;

    zip.file('run.js', runjs);
    zip.file('package.json', JSON.stringify(packageJSON));

    // download
    var data = zip.generate({base64: false, compression: 'DEFLATE'});
    fs.writeFileSync(path.resolve(req.DIR.TMPD, name + '.zip'), data, 'binary');

    res.download(path.resolve(req.DIR.TMPD, name + '.zip'));
});

module.exports = router;