'use strict';

module.exports = (config)=> (req, res, next)=> {
    const fs = require('fs');
    const path = require('path');
    const fsext = require('fs-extra');

    let {thread} = req.modules;

    let app = {};

    app.install = (args)=> new Promise((resolve)=> {
        let {WORKSPACE_PATH, lib} = args;
        lib = JSON.parse(lib);

        let npmlibs = ['flowpipe'];
        let npms = lib.value.match(/require\([^\)]+\)/gim);

        for (let i = 0; i < npms.length; i++) {
            try {
                npms[i] = npms[i].replace(/ /gim, '');
                npms[i] = npms[i].replace(/\n/gim, '');
                npms[i] = npms[i].replace(/\t/gim, '');
                npms[i] = npms[i].replace("require('", '');
                npms[i] = npms[i].replace("')", '');

                let exists = true;
                try {
                    require(npms[i]);
                } catch (e) {
                    exists = false;
                }

                let list = fs.readdirSync(path.resolve(__dirname, '..', '..', '..', 'node_modules'));
                for (let j = 0; j < list.length; j++)
                    if (list[j] == npms[i])
                        exists = false;

                if (fs.existsSync(path.resolve(WORKSPACE_PATH, 'node_modules'))) {
                    list = fs.readdirSync(path.resolve(WORKSPACE_PATH, 'node_modules'));
                    for (let j = 0; j < list.length; j++)
                        if (list[j] == npms[i])
                            exists = true;
                }

                if (!exists)
                    npmlibs.push(npms[i]);
            } catch (e) {
            }
        }

        thread.install(npmlibs, WORKSPACE_PATH).then(resolve);
    });

    app.save = (args)=> new Promise((resolve)=> {
        // initialize variables
        let {WORKSPACE_PATH, TMP_PATH, lib, scripts, target} = args;
        target = target && target != -1 ? target : 'libs';
        lib = JSON.parse(lib);
        scripts = JSON.parse(scripts);

        // check required files
        if (!fs.existsSync(WORKSPACE_PATH)) fsext.mkdirsSync(WORKSPACE_PATH);
        if (!fs.existsSync(path.resolve(WORKSPACE_PATH, 'package.json'))) fs.writeFileSync(path.resolve(WORKSPACE_PATH, 'package.json'), '{}');

        if (!fs.existsSync(TMP_PATH)) fsext.mkdirsSync(TMP_PATH);

        // save project info.
        fs.writeFileSync(path.join(TMP_PATH, 'scripts.json'), JSON.stringify(scripts));
        fs.writeFileSync(path.join(TMP_PATH, 'lib.json'), JSON.stringify(lib));

        // check node requirements
        let libVal = lib.value;
        let requirestr = libVal.match(/require\([^\)]+\)/gim);
        for (let i = 0; i < requirestr.length; i++) {
            requirestr[i] = requirestr[i].replace(/ /gim, '');
            requirestr[i] = requirestr[i].replace(/\n/gim, '');
            requirestr[i] = requirestr[i].replace(/\t/gim, '');
            requirestr[i] = requirestr[i].replace("require('", '');
            requirestr[i] = requirestr[i].replace("')", '');
            requirestr[i] = requirestr[i].trim();

            if (!requirestr[i] || requirestr[i].length == 0) continue;
        }

        // find loop location
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

        // runjs
        let runjs = `
            ${lib.value}
            
            const Flowpipe = require('flowpipe');
            let flowpipe = Flowpipe.instance('app');
            
            let graphId = 1;
            
            console.graph = (data)=> {
                let resp = JSON.stringify({ id: (data.id ? data.id : 'chartjs-' + graphId), data: data });
                console.log('[chartjs] ' + resp);
                graphId++;
            }
        `;

        // run all
        if (target === 'libs') {
            // insert scripts
            for (let i = 0; i < scripts.length; i++) {
                if (scripts[i].type == 'work') {
                    runjs += `
                        flowpipe.then('${i}', (args)=> new Promise((resolve)=> {
                            ${scripts[i].value}
                            ${scripts[i].value.indexOf('resolve()') == -1 ? 'resolve();' : ''}
                        }));
                    `;

                    if (runInsert[i])
                        for (let j = 0; j < runInsert[i].length; j++)
                            runjs += `
                                flowpipe.loop('${runInsert[i][j].start}', (args)=> ${runInsert[i][j].condition.replace(';', '')});
                            `;
                }
            }
        } else {
            runjs += `
                flowpipe.then(()=> new Promise((resolve)=> {
                    try {
                        let variables = JSON.parse(require('fs').readFileSync(require('path').resolve(__dirname, 'variable.json'), 'utf-8'));
                        for(let key in variables)
                            try {
                                global[key] = JSON.parse(variables[key]);
                            } catch(e) {
                                try {
                                    global[key] = variables[key];
                                } catch(e) {}
                            }
                    } catch(e) {}
                    
                    resolve();
                }));
            `;

            let variables = `
                flowpipe.then(()=> new Promise((resolve)=> {
                    let variables = {};
                    for(let key in global)
                        try {
                            if(typeof global[key] == 'object')
                                variables[key] = JSON.stringify(global[key]);
                            else
                                variables[key] = global[key];
                        } catch(e) {}
                    
                    require('fs').writeFileSync(require('path').resolve(__dirname, 'variable.json'), JSON.stringify(variables));
                    resolve();
                }));
            `;

            if (scripts[target].type == 'work') {
                runjs += `
                    flowpipe.then('${target}', (args)=> new Promise((resolve)=> {
                        ${scripts[target].value}
                        ${scripts[target].value.indexOf('resolve') == -1 ? 'resolve();' : ''}
                    }));
                    
                    ${variables}
                `;
            } else if (scripts[target].type == 'loop') {
                for (let i = target; i <= scripts[target].block_end; i++) {
                    if (scripts[i].type == 'work') {
                        runjs += `
                            flowpipe.then('${i}', (args)=> new Promise((resolve)=> {
                                ${scripts[i].value}
                                ${scripts[i].value.indexOf('resolve()') == -1 ? 'resolve();' : ''}
                            }));
                            
                            ${variables}
                        `;

                        if (runInsert[i])
                            for (let j = 0; j < runInsert[i].length; j++)
                                runjs += `
                                    flowpipe.loop('${runInsert[i][j].start}', (args)=> ${runInsert[i][j].condition.replace(';', '')});
                                `;
                    }
                }
            }
        }

        runjs += `
            flowpipe.run();
        `;

        let SAVE_NAME = target == 'libs' ? 'run.js' : `run-${target}.js`;
        fs.writeFileSync(path.resolve(TMP_PATH, SAVE_NAME), runjs);

        resolve();
    });

    req.saturn = app;

    next();
};