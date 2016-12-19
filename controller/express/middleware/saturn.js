'use strict';

module.exports = (config)=> (req, res, next)=> {
    const fs = require('fs');
    const path = require('path');
    const fsext = require('fs-extra');
    const core = require('saturn-core');

    // work manager thread
    let {thread} = req.modules;

    // express saturn middleware
    let app = {};

    // npm install @workspace
    app.install = (args)=> new Promise((resolve)=> {
        let {WORKSPACE_PATH, lib, runpath} = args;

        lib = JSON.parse(lib);

        let npmlibs = core.compile.node_modules(lib.value, path.join(WORKSPACE_PATH, runpath));

        if (fs.existsSync(path.join(WORKSPACE_PATH, runpath, 'package.json')) == false)
            fs.writeFileSync(path.join(WORKSPACE_PATH, runpath, 'package.json'), JSON.stringify({}));

        thread.install(npmlibs, path.join(WORKSPACE_PATH, runpath), runpath).then(resolve);
    });

    app.save = (args)=> new Promise((resolve)=> {
        // initialize variables
        let {WORKSPACE_PATH, TMP_PATH, lib, scripts, config} = args;

        // check required files
        if (!fs.existsSync(WORKSPACE_PATH)) fsext.mkdirsSync(WORKSPACE_PATH);
        if (!fs.existsSync(TMP_PATH)) fsext.mkdirsSync(TMP_PATH);

        // save project info.
        if (lib)
            fs.writeFileSync(path.join(TMP_PATH, 'lib.json'), lib);
        if (scripts)
            fs.writeFileSync(path.join(TMP_PATH, 'scripts.json'), scripts);
        if (config)
            fs.writeFileSync(path.join(TMP_PATH, 'config.json'), config);

        resolve();
    });

    req.saturn = app;

    next();
};