'use strict';
const express = require("express");
const router = express.Router();

router.post("/", function (req, res) {
    let {user, pw} = req.body;
    if (!user || !pw) return res.send({status: false});
    let result = req.user.signin(user, pw);
    if (result && result.user) res.send({status: true});
    else res.send({status: false});
});

module.exports = router;