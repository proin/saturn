'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');

router.post("/", function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    let {file, target} = req.body;
    if (!file || !target) return res.send({err: new Error('not defined name')});

    const WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;

    let COPY_PATH = path.join(WORKSPACE_PATH, file);
    let TARGET_PATH = path.join(WORKSPACE_PATH, target, path.basename(file));

    let copyIdx = 0;
    while (fs.existsSync(TARGET_PATH)) {
        TARGET_PATH = path.join(WORKSPACE_PATH, target, path.basename(file, path.extname(file)) + '_copy' + (copyIdx === 0 ? "" : '_' + copyIdx) + path.extname(file));
        copyIdx++;
    }

    fsext.copy(COPY_PATH, TARGET_PATH, ()=> {
        res.send({status: true});
    });
});

module.exports = router;