'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const asar = require('asar');

router.get("/", function (req, res) {
    let {thread} = req.modules;
    let {name} = req.query;

    if (!name) return res.send({err: new Error('not defined name')});

    if (thread.log[name]) thread.log[name].splice(0, thread.log[name].length - 1);

    res.send({status: true});
});

module.exports = router;