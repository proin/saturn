'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get("/", function (req, res) {
    // allow for everyone
    if (req.user.check() === 'DENIED') return;
    const RUNNING_STATUS_PATH = path.resolve(req.DIR.WORKSPACE_PATH, '.tmp', 'running.json');
    let running = {};
    if (fs.existsSync(RUNNING_STATUS_PATH))
        running = JSON.parse(fs.readFileSync(RUNNING_STATUS_PATH, 'utf-8'));

    res.send(running);
});

module.exports = router;