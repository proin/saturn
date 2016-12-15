'use strict';

module.exports = (config)=> {
    let session = require("express-session");

    global.session = session({
        secret: config.session.secret,
        resave: config.session.resave,
        saveUninitialized: config.session.saveUninitialized
    });

    return global.session;
};