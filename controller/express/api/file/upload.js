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
            ASAR.push(_DEST);
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
        let NAME = path.basename(PRJ_PATH);
        let _DEST = path.resolve(WORKSPACE_PATH, NAME);

        asar.extractAll(PRJ_PATH, _DEST);
        unzipping();
    };

    unzipping();
});

module.exports = router;