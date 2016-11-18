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

    try {
        if (filepath.indexOf(req.DIR.USERHOME) !== 0) return res.send({status: false});
    } catch (e) {
        return res.send({status: false});
    }


    fs.writeFileSync(path.resolve(filepath), filevalue);
    res.send({status: true, data: filevalue});
});

module.exports = router;