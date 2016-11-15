'use strict';

module.exports = (config)=> {
    const session = require("express-session");

    return session({
        secret: config.session.secret,
        resave: config.session.resave,
        saveUninitialized: config.session.saveUninitialized
    });
};