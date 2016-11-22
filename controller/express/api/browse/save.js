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

    filepath = path.join(req.DIR.WORKSPACE_PATH, filepath);

    fs.writeFileSync(path.resolve(filepath), filevalue);
    res.send({status: true, data: filevalue});
});

module.exports = router;