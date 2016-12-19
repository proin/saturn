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
    res.send(thread.remote.list[req.body.project_path] ? thread.remote.list[req.body.project_path] : {});
});

module.exports = router;