'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const asar = require('asar');

router.get("/", function (req, res) {
    let {thread} = req.modules;
    let {name} = req.query;

    if (!name) return res.send({err: new Error('not defined name')});

    let running = thread.status[name];

    res.send({running: running, data: thread.log[name] ? thread.log[name] : []});
    // if (thread.log[name]) thread.log[name].splice(0, thread.log[name].length - 10);
    if (thread.log[name]) thread.log[name].splice(0);
});

module.exports = router;