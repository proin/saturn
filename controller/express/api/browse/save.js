'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');

router.post("/", function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    let {filepath, filevalue} = req.body;

    filevalue =  filevalue.replace(/\t/gim, '    ');

    filepath = path.join(req.DIR.WORKSPACE_PATH, filepath);
    if (filepath.indexOf(req.DIR.WORKSPACE_PATH) == -1)
        return res.send({status: false});

    fs.writeFileSync(path.resolve(filepath), filevalue);
    res.send({status: true, data: filevalue});
});

module.exports = router;