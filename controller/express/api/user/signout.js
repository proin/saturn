'use strict';
const express = require("express");
const router = express.Router();

router.get("/", (req, res)=> {
    // allow for everyone
    req.user.signout();
    res.send({status: true});
});

module.exports = router;