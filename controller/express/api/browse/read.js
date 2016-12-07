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

    filepath = path.join(req.DIR.WORKSPACE_PATH, filepath);

    if (filepath.indexOf(req.DIR.WORKSPACE_PATH) == -1)
        return res.send({status: false});

    if(fs.existsSync(filepath)) {
        res.send({status: true, data: fs.readFileSync(filepath, 'utf-8')});
    } else {
        res.send({status: true, data: '{}'});
    }


});

module.exports = router;