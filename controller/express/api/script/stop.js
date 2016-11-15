'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const asar = require('asar');

router.get("/", function (req, res) {
    let {thread} = req.modules;
    let {name} = req.query;

    if (!name) return res.send({err: new Error('not defined name')});

    thread.stop(name).then(()=> {
        res.send({running: false, data: thread.log[name] ? thread.log[name] : []});
    });
});

module.exports = router;