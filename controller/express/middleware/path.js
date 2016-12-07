'use strict';

module.exports = (config)=> {
    const path = require('path');

    return (req, res, next)=> {

        req.DIR = {};
        req.DIR.USERHOME = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

        if (config.HOME) req.DIR.USERHOME = path.resolve(req.DIR.USERHOME, config.HOME);
        else if (config.home) req.DIR.USERHOME = path.resolve(req.DIR.USERHOME, config.home);
        else req.DIR.USERHOME = path.resolve(req.DIR.USERHOME, '.node-saturn');

        req.DIR.WORKSPACE_PATH = path.resolve(req.DIR.USERHOME);
        req.DIR.TMP = (name)=> path.resolve(req.DIR.USERHOME, '.tmp', name);
        req.DIR.TMPD = path.resolve(req.DIR.USERHOME, '.tmp');
        next();
    };
};