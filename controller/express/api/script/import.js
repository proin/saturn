'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const path = require('path');
const asar = require('asar');

router.get("/", function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    let {name} = req.query;

    if (!name) return res.send({err: new Error('not defined name')});

    const PRJ_PATH = path.resolve(req.DIR.WORKSPACE_PATH, `${name}.satbook`);
    const DOWNLOAD_PATH = path.resolve(req.DIR.TMPD, `download`, `${name}.satbook`);

    if (!fs.existsSync(PRJ_PATH)) return res.send({err: new Error('no work')});

    asar.createPackage(PRJ_PATH, DOWNLOAD_PATH, function () {
        res.download(DOWNLOAD_PATH);
    });
});

module.exports = router;