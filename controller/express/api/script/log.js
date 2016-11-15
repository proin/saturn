'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const asar = require('asar');

router.get("/", function (req, res) {
    let {thread} = req.modules;
    let {name} = req.query;

    if (!name) return res.send({err: new Error('not defined name')});

    let running = true;
    if (!thread.log[name]) running = false;
    else if (thread.log[name][thread.log[name].length - 1].status == 'finish')
        running = false;
    res.send({running: running, data: thread.log[name] ? thread.log[name] : []});
});

module.exports = router;