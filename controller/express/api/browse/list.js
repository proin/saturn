'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get("/", function (req, res) {
    // allow for everyone
    if (req.user.check() === 'DENIED') return;

    let {read_path} = req.query;

    let WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;

    if (!fs.existsSync(WORKSPACE_PATH)) {
        res.send([]);
        return;
    }

    if (read_path) {
        read_path = JSON.parse(read_path);
        for (let i = 0; i < read_path.length; i++)
            WORKSPACE_PATH = path.resolve(WORKSPACE_PATH, read_path[i]);
    }

    if (WORKSPACE_PATH.indexOf(req.DIR.WORKSPACE_PATH) !== 0) return res.send([]);
    if (!fs.existsSync(WORKSPACE_PATH)) return res.send([]);

    let dirs = fs.readdirSync(WORKSPACE_PATH);
    let ignores = {'.git': true, '.idea': true, '.tmp': true};
    let projectList = {};
    for (let i = 0; i < dirs.length; i++) {
        if (ignores[dirs[i]]) continue;
        if (path.extname(dirs[i]) == '.satbook' && fs.lstatSync(path.resolve(WORKSPACE_PATH, dirs[i])).isDirectory()) {
            let info = projectList[path.basename(dirs[i], path.extname(dirs[i]))] = {};
            info.type = 'project';
            info.path = path.resolve(WORKSPACE_PATH, dirs[i]).replace(req.DIR.WORKSPACE_PATH, '');
            if (process.platform == 'win32') info.path = info.path.replace(/\\/gim, '/');
            info.name = path.basename(dirs[i], path.extname(dirs[i]));
        } else {
            let info = projectList[dirs[i]] = {};
            info.type = fs.lstatSync(path.resolve(WORKSPACE_PATH, dirs[i])).isDirectory() ? 'folder' : 'file';
            info.path = path.resolve(WORKSPACE_PATH, dirs[i]).replace(req.DIR.WORKSPACE_PATH, '');
            if (process.platform == 'win32') info.path = info.path.replace(/\\/gim, '/');
            info.name = dirs[i];
        }
    }

    let result = [];
    for (let key in projectList)
        result.push(projectList[key]);

    result.sort((a, b)=> {
        if (b.name == 'node_modules') return 1;
        if (a.name == 'node_modules') return -1;

        if (a.type === b.type) return a.name.localeCompare(b.name);
        return b.type.localeCompare(a.type);
    });

    res.send(result);
});

module.exports = router;