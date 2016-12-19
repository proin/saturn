'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const path = require('path');
const core = require('saturn-core');

router.post("/", function (req, res) {
    // only allow for user
    if (req.user.check() !== 'GRANTALL') return;

    let {thread} = req.modules;
    thread.remote.stop(req.body).then((response)=> {
        res.send(response);
    });
});

module.exports = router;