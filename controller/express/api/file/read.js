'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');

router.post("/", function (req, res) {
    let {filepath} = req.body;
    res.send({status: true, data: fs.readFileSync(path.resolve(filepath), 'utf-8')});
});

module.exports = router;