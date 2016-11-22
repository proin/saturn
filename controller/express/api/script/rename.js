'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');

router.post("/", function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    let {filepath, rename} = req.body;
    if (!filepath) return res.send({err: new Error('not defined name')});

    const WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;
    const ORG_PATH = path.join(WORKSPACE_PATH, filepath);
    const MV_PATH = path.resolve(path.dirname(ORG_PATH), `${rename}.satbook`);

    fsext.move(ORG_PATH, MV_PATH, function (err) {
        if (err) res.send({status: false});
        else res.send({status: true, path: MV_PATH.replace(req.DIR.WORKSPACE_PATH, '')});
    });
});

module.exports = router;