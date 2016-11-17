'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');
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

    if (!fs.existsSync(DEST)) fsext.mkdirsSync(DEST);
    for (let i = 0; i < req.files.length; i++) {
        let _DEST = path.resolve(DEST, req.files[i].originalname);
        fs.writeFileSync(_DEST, req.files[i].buffer);
    }

    res.send({status: true});
});

module.exports = router;