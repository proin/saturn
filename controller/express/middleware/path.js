'use strict';

module.exports = ()=> {
    const path = require('path');

    return (req, res, next)=> {

        req.DIR = {};
        req.DIR.WORKSPACE_PATH = path.resolve(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.node-saturn', 'workspace');
        req.DIR.TMP = (name)=> path.resolve(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.node-saturn', 'tmp', name);
        req.DIR.TMPD = path.resolve(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.node-saturn', 'tmp');
        next();
    };
};