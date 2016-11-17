'use strict';
const express = require("express");
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.post("/", function (req, res) {
    let {thread} = req.modules;
    let {name, scripts, lib, target} = req.body;

    if (!name) return res.send({err: new Error('not defined name')});

    const WORKSPACE_PATH = req.DIR.WORKSPACE_PATH;
    const TMP_PATH = path.resolve(WORKSPACE_PATH, `${name}.satbook`);

    let args = req.body;
    args.WORKSPACE_PATH = WORKSPACE_PATH;
    args.TMP_PATH = TMP_PATH;

    lib = JSON.parse(lib);
    scripts = JSON.parse(scripts);

    req.saturn.workspace.save(args)
        .then(()=> new Promise((resolve)=> {
            let requirestr = lib.value.match(/require\([^\)]+\)/gim);
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
            runjs += `const Flowpipe = require('Flowpipe');\n`;

            runjs += `let flowpipe = Flowpipe.instance('app');\n`;

            runjs += `flowpipe.then(()=> new Promise((resolve)=> {`;
            runjs += `try {\n`;
            runjs += `let variables = JSON.parse(require('fs').readFileSync(require('path').resolve(__dirname, 'variable.json'), 'utf-8'));\n`;
            runjs += `for(let key in variables)\n`;
            runjs += `try {\n`;
            runjs += `global[key] = JSON.parse(variables[key]);\n`;
            runjs += `} catch(e) {\n`;
            runjs += `try {\n`;
            runjs += `global[key] = variables[key];\n`;
            runjs += `} catch(e) {}\n`;
            runjs += `}\n`;
            runjs += `} catch(e) {}\n`;
            runjs += `resolve();\n`;
            runjs += `}));\n`;

            if (scripts[target].type == 'work') {
                let jsm = fs.readFileSync(path.resolve(TMP_PATH, 'scripts', `script-${target}.js`), 'utf-8');
                runjs += `flowpipe.then('${target}', ${jsm});\n`;
                runjs += `flowpipe.then(()=> new Promise((resolve)=> {`;
                runjs += `let variables = {};`;
                runjs += `for(let key in global)\n`;
                runjs += `try {\n`;
                runjs += `if(typeof global[key] == 'object')\n`;
                runjs += `variables[key] = JSON.stringify(global[key]);\n`;
                runjs += `else\n`;
                runjs += `variables[key] = global[key];\n`;
                runjs += `} catch(e) {}\n`;
                runjs += `require('fs').writeFileSync(require('path').resolve(__dirname, 'variable.json'), JSON.stringify(variables));\n`;
                runjs += `resolve();\n`;
                runjs += `}));\n`;
            } else if (scripts[target].type == 'loop') {
                let runInsert = {};
                for (let i = target; i < scripts[target].block_end * 1; i++) {
                    if (scripts[i].type == 'loop') {
                        let start = i * 1 + 1;
                        for (let j = i * 1 + 1; j < scripts.length; j++) {
                            if (scripts[j].type != 'loop') {
                                start = j;
                                break;
                            }
                        }

                        if (!runInsert[scripts[i].block_end]) runInsert[scripts[i].block_end] = [];
                        runInsert[scripts[i].block_end].unshift({start: start, end: scripts[i].block_end, condition: scripts[i].value});
                    }
                }

                for (let i = target; i <= scripts[target].block_end; i++) {
                    if (scripts[i].type == 'work') {
                        let jsm = fs.readFileSync(path.resolve(TMP_PATH, 'scripts', `script-${i}.js`), 'utf-8');
                        runjs += `flowpipe.then('${i}', ${jsm});\n`;

                        runjs += `flowpipe.then(()=> new Promise((resolve)=> {`;
                        runjs += `let variables = {};`;
                        runjs += `for(let key in global)\n`;
                        runjs += `try {\n`;
                        runjs += `if(typeof global[key] == 'object')\n`;
                        runjs += `variables[key] = JSON.stringify(global[key]);\n`;
                        runjs += `else\n`;
                        runjs += `variables[key] = global[key];\n`;
                        runjs += `} catch(e) {}\n`;
                        runjs += `require('fs').writeFileSync(require('path').resolve(__dirname, 'variable.json'), JSON.stringify(variables));\n`;
                        runjs += `resolve();\n`;
                        runjs += `}));\n`;
                    }

                    if (runInsert[i])
                        for (let j = 0; j < runInsert[i].length; j++)
                            runjs += `flowpipe.loop('${runInsert[i][j].start}', (args)=> ${runInsert[i][j].condition.replace(';', '')});\n`
                }
            }

            runjs += `flowpipe.run()\n`;

            fs.writeFileSync(path.resolve(TMP_PATH, 'run-instance.js'), runjs);

            resolve();
        }))
        .then(()=> {
            if (!thread.log[name]) thread.log[name] = [];
            thread.log[name].push({module: `${name}`, status: `install`, message: `installing dependencies...`});
            thread.status[name] = true;

            let npmlibs = ['flowpipe'];
            let npms = lib.value.match(/require\([^\)]+\)/gim);

            for (let i = 0; i < npms.length; i++) {
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

                npmlibs.push(npms[i]);
            }

            return thread.install(npmlibs, WORKSPACE_PATH);
        }).then(()=> {
            thread.status[name] = false;
            return thread.run(name, true);
        })
        .then(()=> {
            res.send({status: true});
        });
});

module.exports = router;