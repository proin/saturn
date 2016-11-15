'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');

router.post("/", function (req, res) {
    let {read_path, files} = req.body;

    let COPY_PATH = req.DIR.WORKSPACE_PATH;
    if (read_path) {
        read_path = JSON.parse(read_path);
        for (let i = 0; i < read_path.length; i++)
            COPY_PATH = path.resolve(COPY_PATH, read_path[i]);
    }

    if (files) {
        files = JSON.parse(files);
        for (let i = 0; i < files.length; i++) {
            let cpf = path.resolve(COPY_PATH, path.basename(files[i]));

            if (fs.lstatSync(files[i]).isDirectory() && !fs.existsSync(cpf)) {
                fsext.mkdirsSync(path.resolve(COPY_PATH, path.basename(files[i])));
            }

            try {
                fsext.copySync(files[i], cpf);
            } catch (e) {
            }
        }
    }

    res.send({status: true});
});

module.exports = router;