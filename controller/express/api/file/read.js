'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');

router.post("/", function (req, res) {
    // allow for everyone
    if (req.user.check() === 'DENIED') return;

    let {filepath} = req.body;

    try {
        if (filepath.indexOf(req.DIR.WORKSPACE_PATH) !== 0) return res.send({status: false});
    } catch (e) {
        return res.send({status: false});
    }

    res.send({status: true, data: fs.readFileSync(path.resolve(filepath), 'utf-8')});
});

module.exports = router;