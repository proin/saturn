'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');
const zipFolder = require('zip-folder');

router.get("/", function (req, res, next) {
    // allow for everyone
    if (req.user.check() === 'DENIED') return;

    let {filepath} = req.query;

    filepath = path.join(req.DIR.WORKSPACE_PATH, filepath);

    if (filepath.indexOf(req.DIR.WORKSPACE_PATH) == -1)
        return res.send({status: false});

    if (path.extname(filepath) === '.json') {
        res.send(JSON.parse(fs.readFileSync(path.resolve(filepath), 'utf-8')));
    } else {
        if (fs.lstatSync(path.resolve(filepath)).isDirectory()) {
            zipFolder(path.resolve(filepath), path.resolve(req.DIR.TMPD, path.basename(req.query.filepath) + '.zip'), function (err) {
                res.download(path.resolve(req.DIR.TMPD, path.basename(req.query.filepath) + '.zip'));
            });
        } else {
            res.download(path.resolve(filepath));
        }
    }
});

module.exports = router;