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

    let result = {};
    let project_path = req.body.project_path;
    result.log = thread.remote.log[project_path] ? thread.remote.log[project_path] : {};
    result.list = thread.remote.list[project_path] ? thread.remote.list[project_path] : {};

    res.send(result);
});

module.exports = router;