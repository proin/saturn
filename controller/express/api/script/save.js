'use strict';
const express = require("express");
const router = express.Router();
const path = require('path');

router.post("/", function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    let {name} = req.body;

    if (!name) return res.send({err: new Error('not defined name')});

    const WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;
    const TMP_PATH = path.resolve(WORKSPACE_PATH, `${name}.satbook`);

    let args = req.body;
    args.WORKSPACE_PATH = WORKSPACE_PATH;
    args.TMP_PATH = TMP_PATH;

    req.saturn.workspace.save(args).then(()=> {
        res.send({status: true});
    });
});

module.exports = router;