'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');

router.get("/", function (req, res, next) {
    // allow for everyone
    if (req.user.check() === 'DENIED') return;

    let {filepath} = req.query;
    try {
        if (filepath.indexOf(req.DIR.WORKSPACE_PATH) !== 0) return next();
    } catch (e) {
        return next();
    }

    if (path.extname(filepath) === '.json') {
        res.send(JSON.parse(fs.readFileSync(path.resolve(filepath), 'utf-8')));
    } else {
        res.download(path.resolve(filepath));
    }
});

module.exports = router;