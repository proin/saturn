'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');
const asar = require('asar');
const multer = require('multer');
let upload = multer();

router.post("/", upload.array('files', 10000), function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    let {read_path, dest_path} = req.body;

    let WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;
    if (read_path) {
        read_path = JSON.parse(read_path);
        for (let i = 0; i < read_path.length; i++)
            WORKSPACE_PATH = path.resolve(WORKSPACE_PATH, read_path[i]);
    }

    let DEST = path.resolve(WORKSPACE_PATH, dest_path);
    let ASAR = [];

    if (!fs.existsSync(DEST)) fsext.mkdirsSync(DEST);
    if (!fs.existsSync(req.DIR.TMPD)) fsext.mkdirsSync(req.DIR.TMPD);

    for (let i = 0; i < req.files.length; i++) {
        if (path.extname(req.files[i].originalname) === '.satbook') {
            let _DEST = path.resolve(req.DIR.TMPD, req.files[i].originalname);
            fs.writeFileSync(_DEST, req.files[i].buffer);
            ASAR.push({tmp: _DEST, dest: path.resolve(DEST, req.files[i].originalname)});
        } else {
            let _DEST = path.resolve(DEST, req.files[i].originalname);
            fs.writeFileSync(_DEST, req.files[i].buffer);
        }
    }

    let unzipping = ()=> {
        if (ASAR.length == 0) {
            res.send({status: true});
            return;
        }

        let PRJ_PATH = ASAR.splice(0, 1)[0];
        asar.extractAll(PRJ_PATH.tmp, PRJ_PATH.dest);
        unzipping();
    };

    unzipping();
});

module.exports = router;