'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');

router.post("/", function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    let {filepath, type, rename} = req.body;
    if (!filepath) return res.send({err: new Error('not defined name')});

    const WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;
    const ORG_PATH = path.join(WORKSPACE_PATH, filepath);
    const MV_PATH = path.resolve(path.dirname(ORG_PATH), type === 'project' ? `${rename}.satbook` : rename);

    fsext.move(ORG_PATH, MV_PATH, function (err) {
        let RESULT_PATH = MV_PATH.replace(req.DIR.WORKSPACE_PATH, '');
        if (process.platform == 'win32') RESULT_PATH = RESULT_PATH.replace(/\\/gim, '/');

        if (err) res.send({status: false});
        else res.send({status: true, path: RESULT_PATH});
    });
});

module.exports = router;