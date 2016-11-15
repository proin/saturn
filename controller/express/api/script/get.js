'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get("/", function (req, res) {
    let {name} = req.query;

    if (!name) return res.send({err: new Error('not defined name')});

    const WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;
    const TMP_PATH = path.resolve(WORKSPACE_PATH, `${name}.satbook`);

    if (!fs.existsSync(TMP_PATH)) return res.send({err: new Error('no work')});

    res.send({lib: JSON.parse(fs.readFileSync(path.resolve(TMP_PATH, 'lib.json'), 'utf-8')), scripts: JSON.parse(fs.readFileSync(path.resolve(TMP_PATH, 'scripts.json'), 'utf-8'))});
});

module.exports = router;