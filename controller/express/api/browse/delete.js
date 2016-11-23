'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');

router.post("/", function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    let {rm} = req.body;

    let WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;

    if (rm) {
        rm = JSON.parse(rm);

        for (let i = 0; i < rm.length; i++) {
            if (path.join(WORKSPACE_PATH, rm[i]).indexOf(req.DIR.WORKSPACE_PATH) == -1) continue;
            try {
                fsext.removeSync(path.join(WORKSPACE_PATH, rm[i]));
            } catch (e) {
            }
        }
    }

    res.send({status: true});
});

module.exports = router;