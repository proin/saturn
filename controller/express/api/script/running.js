'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get("/", function (req, res) {
    // allow for everyone
    if (req.user.check() === 'DENIED') return;

    let {thread} = req.modules;

    res.send(thread.status);
});

module.exports = router;