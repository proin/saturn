'use strict';

module.exports = (config)=> (req, res, next)=> {
    req.config = config;

    const fs = require('fs');
    const path = require('path');
    const fsext = require('fs-extra');

    let app = {};

    app.workspace = {};
    app.workspace.save = (args)=> new Promise((resolve)=> {
        let {WORKSPACE_PATH, TMP_PATH, lib, scripts} = args;
        if (!fs.existsSync(WORKSPACE_PATH)) fsext.mkdirsSync(WORKSPACE_PATH);
        if (!fs.existsSync(path.resolve(WORKSPACE_PATH, 'package.json'))) fs.writeFileSync(path.resolve(WORKSPACE_PATH, 'package.json'), '{}');

        fsext.removeSync(path.resolve(TMP_PATH, 'scripts'));
        fsext.mkdirsSync(path.resolve(TMP_PATH, 'scripts'));

        lib = JSON.parse(lib);
        scripts = JSON.parse(scripts);

        fs.writeFileSync(path.resolve(TMP_PATH, 'scripts.json'), JSON.stringify(scripts));
        fs.writeFileSync(path.resolve(TMP_PATH, 'lib.json'), JSON.stringify(lib));

        let libVal = lib.value;
        let requirestr = libVal.match(/require\([^\)]+\)/gim);
        for (let i = 0; i < requirestr.length; i++) {
            requirestr[i] = requirestr[i].replace(/ /gim, '');
            requirestr[i] = requirestr[i].replace(/\n/gim, '');
            requirestr[i] = requirestr[i].replace(/\t/gim, '');
            requirestr[i] = requirestr[i].replace("require('", '');
            requirestr[i] = requirestr[i].replace("')", '');
            if (fs.existsSync(path.resolve(WORKSPACE_PATH, requirestr[i])))
                lib.value = lib.value.replace(requirestr[i], path.resolve(WORKSPACE_PATH, requirestr[i]));
        }

        let runjs = lib.value + '\n';
        runjs += `const Flowpipe = require('flowpipe');\n`;
        runjs += `let flowpipe = Flowpipe.instance('app');\n`;

        let runInsert = {};
        for (let i = 0; i < scripts.length; i++) {
            if (scripts[i].type == 'loop') {
                let start = i + 1;
                for (let j = i + 1; j < scripts.length; j++) {
                    if (scripts[j].type != 'loop') {
                        start = j;
                        break;
                    }
                }
                if (!runInsert[scripts[i].block_end]) runInsert[scripts[i].block_end] = [];
                runInsert[scripts[i].block_end].unshift({start: start, end: scripts[i].block_end, condition: scripts[i].value});
            }
        }

        for (let i = 0; i < scripts.length; i++) {
            if (scripts[i].type == 'work') {
                let jsm = '';
                jsm += `(args)=> new Promise((resolve)=> {\n`;
                jsm += `${scripts[i].value}\n`;

                if (jsm.indexOf('resolve()') == -1)
                    jsm += `resolve();\n`;
                jsm += `})\n`;

                fs.writeFileSync(path.resolve(TMP_PATH, 'scripts', `script-${i}.js`), jsm);

                runjs += `flowpipe.then('${i}', ${jsm});\n`;

                if (runInsert[i])
                    for (let j = 0; j < runInsert[i].length; j++)
                        runjs += `flowpipe.loop('${runInsert[i][j].start}', (args)=> ${runInsert[i][j].condition.replace(';', '')});\n`
            }
        }

        runjs += `flowpipe.run()\n`;

        fs.writeFileSync(path.resolve(TMP_PATH, 'run.js'), runjs);

        resolve();
    });

    req.saturn = app;

    next();
};