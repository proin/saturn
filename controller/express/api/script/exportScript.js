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
    if (!req.query.path) return res.send({err: new Error('not defined name')});

    const PRJ_PATH = path.join(req.DIR.WORKSPACE_PATH, req.query.path);
    const RUN_PATH = path.resolve(PRJ_PATH, 'run.js');
    const LIB_PATH = path.resolve(PRJ_PATH, 'lib.json');
    const SCRIPTS_PATH = path.resolve(PRJ_PATH, 'scripts.json');
    const WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;

    if (!fs.existsSync(LIB_PATH)) return res.send({err: new Error('no work')});

    let lib = JSON.parse(fs.readFileSync(LIB_PATH, 'utf-8'));

    let packageJSON = {dependencies: {flowpipe: ''}};
    packageJSON.name = path.basename(req.query.path, '.satbook');

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

    zip.file('run.js', fs.readFileSync(RUN_PATH, 'utf-8'));
    zip.file('package.json', JSON.stringify(packageJSON));

    // download
    var data = zip.generate({base64: false, compression: 'DEFLATE'});
    fs.writeFileSync(path.resolve(req.DIR.TMPD, path.basename(req.query.path) + '.zip'), data, 'binary');
    res.download(path.resolve(req.DIR.TMPD, path.basename(req.query.path) + '.zip'));
});

module.exports = router;