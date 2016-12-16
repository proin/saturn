'use strict';
const express = require("express");
const router = express.Router();
const path = require('path');

router.get("/", function (req, res) {
    res.send({status: !(req.modules.thread.update === true)});
});

module.exports = router;