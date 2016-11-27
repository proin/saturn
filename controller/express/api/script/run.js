'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.post("/", function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    let {saturn} = req;
    let {thread} = req.modules;
    let {runpath} = req.body;

    if (!runpath) return res.send({err: new Error('not defined name')});

    const WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;
    const TMP_PATH = path.join(WORKSPACE_PATH, runpath);

    let args = req.body;
    args.WORKSPACE_PATH = WORKSPACE_PATH;
    args.TMP_PATH = TMP_PATH;

    saturn.save(args)
        .then(()=> saturn.install(args))
        .then(()=> thread.run(runpath, args.target))
        .then(()=> {
            res.send({status: true});
        });
});

module.exports = router;