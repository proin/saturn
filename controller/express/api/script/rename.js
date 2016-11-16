'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');

router.post("/", function (req, res) {
    let {name, rename} = req.body;

    if (!name) return res.send({err: new Error('not defined name')});

    const WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;
    const ORG_PATH = path.resolve(WORKSPACE_PATH, `${name}.satbook`);
    const MV_PATH = path.resolve(WORKSPACE_PATH, `${rename}.satbook`);

    console.log(name, rename);

    fsext.move(ORG_PATH, MV_PATH, function (err) {
        if (err) res.send({status: false});
        else res.send({status: true});
    });
});

module.exports = router;