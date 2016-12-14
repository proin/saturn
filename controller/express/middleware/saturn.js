'use strict';

let scriptManager = {};

scriptManager.path = {};
scriptManager.path.python = '';
scriptManager.path.workspace = '';

scriptManager.lib = (lib)=> `
${lib.value}
            
const Flowpipe = require('flowpipe');
let flowpipe = Flowpipe.instance('SATURN');

let saturn = {};

saturn.graphId = console.graphId = 1;
saturn.graph = console.graph = (data)=> {
    let resp = JSON.stringify({ id: (data.id ? data.id : 'chartjs-' + console.graphId), data: data });
    console.log('[chartjs] ' + resp);
    console.graphId++;
}

saturn.visId = console.visId = 1;
saturn.vis = console.vis = (visType, data, options)=> {
    let resp = JSON.stringify({ id: (data.id ? data.id : 'vis-' + console.visId), type: visType, data: data, options: options });
    console.log('[visjs] ' + resp);
    console.visId++;
}

saturn.warning = console.warning = (err)=> {
    console.log('[SATURN] WARNING IN WORK');
    console.log(err);
}

saturn.python = (script)=> new Promise((resolve)=> {
    let _spawn = require('child_process').spawn;
    if (process.platform == 'win32')
        _spawn = require('cross-spawn');
    let term = _spawn('python', ['-u', script], {cwd: '${scriptManager.path.workspace}'});

    process.on('SIGINT', () => {
        term.kill();
    });

    term.stdout.on('data', (data)=> {
        console.log(data + '');
    });

    term.stderr.on('data', (data)=> {
        console.log(data + '');
    });

    term.on('close', () => {
        resolve();
        
        let varJSON = '${require('path').join(scriptManager.path.python, 'variable.json')}';
        if(require('fs').existsSync(varJSON)) {
            let v = JSON.parse(require('fs').readFileSync(varJSON, 'utf-8'));
            for(let key in v) 
                global[key] = v[key];
        }
    });
});
`;

scriptManager.work = (target, script)=> `
flowpipe.then('${target}', (args)=> new Promise((resolve)=> {
    ${script.value}
    ${script.value.indexOf('resolve()') == -1 ? 'resolve();' : ''}
}));
`;

scriptManager.escape = (str)=>
    str
        .replace(/[\\]/g, '\\\\')
        .replace(/[\"]/g, '\\\"')
        .replace(/[\/]/g, '\\/')
        .replace(/[\b]/g, '\\b')
        .replace(/[\f]/g, '\\f')
        .replace(/[\n]/g, '\\n')
        .replace(/[\r]/g, '\\r')
        .replace(/[\t]/g, '\\t');

scriptManager.python = (target, script)=> `
flowpipe.then('${target}', (args)=> new Promise((resolve)=> {
    let pythonScript = '# -*- coding: utf-8 -*-';
    
    let newLine = ()=> {
        pythonScript += \`
\`;
    }
    
    newLine();
    
    let variables = {};
    for(let key in global) {
        try {
            JSON.stringify(global[key]);
            variables[key] = global[key];
        } catch(e) {
        }
    }
    
    variables = JSON.parse(JSON.stringify(variables));
    delete variables.console;
    
    pythonScript += 'import json';
    newLine();

    for(let key in variables) {
        if(typeof variables[key] == 'object') {
            pythonScript += key;
            pythonScript += \` = \`;
            pythonScript += JSON.stringify(variables[key]);
            newLine();    
        } else if (typeof variables[key] == 'number') {
            pythonScript += key + ' = ' + variables[key];
            newLine();
        } else if (typeof variables[key] == 'string'){
            variables[key] = variables[key].replace(/\\n/gim, '\\\\n');
            pythonScript += key + ' = "' + variables[key] + '"';
            newLine();
        } else {
            pythonScript += key + ' = "' + variables[key] + '"';
            newLine();
        }
    }
    
    pythonScript += \`${scriptManager.escape(script.value)}\`;
    pythonScript += \`
__save__ = {}
for key in vars().keys():
    if key == '__save__':
        continue;
        
    if type(vars()[key]) is list:
    	__save__[key] = vars()[key]
    elif type(vars()[key]) is str:
        __save__[key] = vars()[key]
    elif type(vars()[key]) is int:
        __save__[key] = vars()[key]
    elif type(vars()[key]) is long:
        __save__[key] = vars()[key]
    elif type(vars()[key]) is float:
        __save__[key] = vars()[key]
    elif type(vars()[key]) is dict:
        __save__[key] = vars()[key]
        
file_ = open('${require('path').join(scriptManager.path.python, 'variable.json')}', 'w')
file_.write(json.dumps(__save__))
file_.close()
\`;
    newLine();
    
    let py = '${require('path').join(scriptManager.path.python, 'python-' + target + '.py')}';
    fs.writeFileSync(py, pythonScript);
    
    saturn.python(py).then(resolve);
}));
`;

scriptManager.loop = (script)=> `
flowpipe.loop('${script.start}', (args)=> ${script.condition.replace(';', '')});
`;

scriptManager.variable = {};
scriptManager.variable.save = ()=> `
flowpipe.then(()=> new Promise((resolve)=> {
    let variables = {};
    for(let key in global)
        try {
            JSON.stringify(global[key]);
            variables[key] = global[key];
        } catch(e) {}
    
    delete variables.console;
    
    require('fs').writeFileSync(require('path').resolve(__dirname, 'variable.json'), JSON.stringify(variables));
    resolve();
}));
`;

scriptManager.variable.loader = ()=> `
flowpipe.then(()=> new Promise((resolve)=> {
    try {
        let variables = JSON.parse(require('fs').readFileSync(require('path').resolve(__dirname, 'variable.json'), 'utf-8'));
        for(let key in variables)
            global[key] = variables[key];
    } catch(e) {
    }
    resolve();
}));
`;


module.exports = (config)=> (req, res, next)=> {
    const fs = require('fs');
    const path = require('path');
    const fsext = require('fs-extra');

    // work manager thread
    let {thread} = req.modules;

    // express saturn middleware
    let app = {};

    // npm install @workspace
    app.install = (args)=> new Promise((resolve)=> {
        let {WORKSPACE_PATH, lib, runpath} = args;
        lib = JSON.parse(lib);

        let npmlibs = ['flowpipe'];
        let npms = lib.value.match(/require\([^\)]+\)/gim);

        // find npm modules
        for (let i = 0; i < npms.length; i++) {
            try {
                // in libs
                npms[i] = npms[i].replace(/ /gim, '');
                npms[i] = npms[i].replace(/\n/gim, '');
                npms[i] = npms[i].replace(/\t/gim, '');
                npms[i] = npms[i].replace("require('", '');
                npms[i] = npms[i].replace('require("', '');
                npms[i] = npms[i].replace('")', '');
                npms[i] = npms[i].replace("')", '');

                // check already exists in workspace
                let exists = true;

                // check is default modules
                try {
                    require(npms[i]);
                } catch (e) {
                    exists = false;
                }

                // if saturn app have it, remove!
                let list = fs.readdirSync(path.resolve(__dirname, '..', '..', 'node_modules'));
                for (let j = 0; j < list.length; j++)
                    if (list[j] == npms[i])
                        exists = false;

                // check require module is file
                if (fs.existsSync(path.join(WORKSPACE_PATH, npms[i])) && fs.lstatSync(path.join(WORKSPACE_PATH, npms[i])).isDirectory() == false) {
                    exists = true;
                }

                // check already exists
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

        if (fs.existsSync(path.join(WORKSPACE_PATH, runpath, 'package.json')) == false) {
            fs.writeFileSync(path.join(WORKSPACE_PATH, runpath, 'package.json'), JSON.stringify({}));
        }

        thread.install(npmlibs, path.join(WORKSPACE_PATH, runpath), runpath).then(resolve);
    });

    app.save = (args)=> new Promise((resolve)=> {
        // initialize variables
        let {WORKSPACE_PATH, TMP_PATH, lib, scripts, target} = args;
        target = target && target != -1 ? target : 'libs';
        lib = JSON.parse(lib);
        scripts = JSON.parse(scripts);

        // check required files
        if (!fs.existsSync(WORKSPACE_PATH)) fsext.mkdirsSync(WORKSPACE_PATH);

        if (!fs.existsSync(TMP_PATH)) fsext.mkdirsSync(TMP_PATH);

        scriptManager.path.python = TMP_PATH;
        scriptManager.path.workspace = WORKSPACE_PATH;

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
            requirestr[i] = requirestr[i].replace('require("', '');
            requirestr[i] = requirestr[i].replace('")', '');
            requirestr[i] = requirestr[i].replace("')", '');
            requirestr[i] = requirestr[i].trim();

            if (!requirestr[i] || requirestr[i].length == 0) continue;

            // replace if it has file dependency
            if (fs.existsSync(path.join(WORKSPACE_PATH, requirestr[i])) && fs.lstatSync(path.join(WORKSPACE_PATH, requirestr[i])).isDirectory() == false) {
                lib.value = lib.value.replace('"' + requirestr[i] + '"', '"' + path.resolve(WORKSPACE_PATH, requirestr[i]) + '"');
                lib.value = lib.value.replace("'" + requirestr[i] + "'", '"' + path.resolve(WORKSPACE_PATH, requirestr[i]) + '"');
            }
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
        let runjs = scriptManager.lib(lib);

        // run all
        if (target === 'libs') {
            // insert scripts
            for (let i = 0; i < scripts.length; i++) {
                if (scripts[i].type == 'work')
                    runjs += scriptManager.work(i, scripts[i]);
                else if (scripts[i].type == 'python')
                    runjs += scriptManager.python(i, scripts[i]);

                if (runInsert[i])
                    for (let j = 0; j < runInsert[i].length; j++)
                        runjs += scriptManager.loop(runInsert[i][j]);
            }
            // run single
        } else {
            runjs += scriptManager.variable.loader();

            let variables = scriptManager.variable.save();

            if (scripts[target].type == 'work') {
                runjs += scriptManager.work(target, scripts[target]);
                runjs += variables;
            } else if (scripts[target].type == 'python') {
                runjs += scriptManager.python(target, scripts[target]);
                runjs += variables;
            } else if (scripts[target].type == 'loop') {
                for (let i = target; i <= scripts[target].block_end; i++) {
                    if (scripts[i].type == 'work') {
                        runjs += scriptManager.work(i, scripts[i]);
                        runjs += variables;

                        if (runInsert[i])
                            for (let j = 0; j < runInsert[i].length; j++)
                                runjs += scriptManager.loop(runInsert[i][j]);
                    }
                }
            }
        }

        runjs += 'flowpipe.run();';

        let SAVE_NAME = target == 'libs' ? 'run.js' : `run-${target}.js`;
        fs.writeFileSync(path.resolve(TMP_PATH, SAVE_NAME), runjs);

        resolve();
    });

    req.saturn = app;

    next();
};