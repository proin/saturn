'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const fsext = require('fs-extra');
const path = require('path');

router.post("/", function (req, res) {
    let {filepath, filevalue} = req.body;
    fs.writeFileSync(path.resolve(filepath), filevalue);
    res.send({status: true, data: filevalue});
});

module.exports = router;