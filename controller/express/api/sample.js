var express = require("express");
var router = express.Router();

router.get("/", function (req, res) {
    res.send("Intergrated Application Skeleton");
});

module.exports = router;