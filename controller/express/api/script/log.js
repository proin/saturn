'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const asar = require('asar');

router.get("/", function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    let {thread} = req.modules;
    let {path} = req.query;

    if (!path) return res.send({err: new Error('not defined path')});

    let running = thread.status[path];

    res.send({running: running, data: thread.log[path] ? thread.log[path] : []});
});

module.exports = router;