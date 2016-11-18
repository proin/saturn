'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');

router.post("/", function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    let {thread} = req.modules;
    let {read_path, rm} = req.body;

    let WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;

    if (read_path) {
        read_path = JSON.parse(read_path);
        for (let i = 0; i < read_path.length; i++)
            WORKSPACE_PATH = path.resolve(WORKSPACE_PATH, read_path[i]);
    }

    try {
        if (WORKSPACE_PATH.indexOf(req.DIR.WORKSPACE_PATH) !== 0) return res.send({status: false});
    } catch (e) {
        return res.send({status: false});
    }

    if (rm) {
        rm = JSON.parse(rm);

        for (let i = 0; i < rm.length; i++) {
            try {
                rm[i] = rm[i].replace(WORKSPACE_PATH, '.');
                fsext.removeSync(path.resolve(WORKSPACE_PATH, rm[i]));
            } catch (e) {
            }
        }
    }

    let dirs = fs.readdirSync(WORKSPACE_PATH);
    let ignores = {'node_modules': true, 'package.json': true, '.git': true, '.idea': true};
    let projectList = {};
    for (let i = 0; i < dirs.length; i++) {
        if (ignores[dirs[i]]) continue;
        if (path.extname(dirs[i]) == '.satbook' && fs.lstatSync(path.resolve(WORKSPACE_PATH, dirs[i])).isDirectory()) {
            let info = projectList[path.basename(dirs[i], path.extname(dirs[i]))] = {};
            info.type = 'project';
            info.path = path.resolve(WORKSPACE_PATH, dirs[i]);
            info.name = path.basename(dirs[i], path.extname(dirs[i]));
            info.status = thread.status[info.name];
        } else {
            let info = projectList[dirs[i]] = {};
            info.type = fs.lstatSync(path.resolve(WORKSPACE_PATH, dirs[i])).isDirectory() ? 'folder' : 'file';
            info.path = path.resolve(WORKSPACE_PATH, dirs[i]);
            info.name = dirs[i];
        }
    }

    let result = [];
    for (let key in projectList)
        result.push(projectList[key]);
    res.send(result);
});

module.exports = router;