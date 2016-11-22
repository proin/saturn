'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const asar = require('asar');

router.get("/", function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    let {thread} = req.modules;
    let {runpath} = req.query;

    if (!runpath) return res.send({err: new Error('not defined name')});

    thread.stop(runpath).then(()=> {
        res.send({running: false, data: thread.log[runpath] ? thread.log[runpath] : []});
    });
});

module.exports = router;