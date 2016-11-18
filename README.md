# Saturn

Saturn is opensource, node.js workspace framework (like `Python Jupyter`)

![Image of Graph](docs/images/saturn.png)

## Installation

### How to start

```bash
npm install -g lwot
git clone https://github.com/proin/saturn 
cd saturn
bower install
cp ./controller/express/config-sample.json ./controller/express/config.json
lwot install
lwot build
lwot express run
# then started at your browser, localhost:3000
```

### Run as Daemon

```bash
lwot express forever start # after launched, press Ctrl+C
lwot express forever stop # stop daemon
lwot express forever log # show logs
```

### Update Saturn

```bash
cd saturn
git pull
lwot build
lwot express run
```

### Configuration

- you can change configuration editing by `./controller/express/config.json` file

```json
{
    "port": 3000, // server port to bind
    "home": "./saturn-project", // workspace home, start from USER HOME
    "dev": true, // display express log
    "log": true, // display thread log
    "readonly": true, // readable project for whom not signin users
    "user": "admin", // admin user
    "password": "admin123", // admin password
    "session": {
        "secret": "sAtuRN-seSsIon-sEcreT",
        "resave": false,
        "saveUninitialized": false
    },
    "MAX_HEAP": 16, // node.js heap memory size
    "MAX_LOG": 500, // display log size
    "encrypt": "sAtuRn"
}
```

## How to Use

### Project & File List

![Image of Graph](docs/images/list.png)

- function in buttons
    - select all
    - create project
    - create folder or js file
    - upload file
    - delete file or project
- function in UI
    - drag & drop files for uploading

### Project

![Image of Graph](docs/images/project.png)

- Structure
    - `libs`: global library & function in here 
    - `work`: if you are using async functions, you must call `resolve()` in the end
    - `loop`: set loop processing condition, `e.g) index < 10`, if condition is true, run under works
    
### Examples Usage

#### code in libs

```javascript
// this calls node_modules
const fs = require('fs');
const path = require('path');

// this calls module in WORKSPACE ROOT PATH
const myFunction = require('./work.js'); 

// define global function
let myApp = (a,b)=> return a + b;
```

#### code in work

```javascript
index = 0; // define global variable
let message = `Hello ${index}`; // define local variables, this can use only in this work

setTimeout(()=> {
    // resolve must call in last, if async.
    // if the work is sync, it is not necessary.
    resolve();  
}, 1000);
```

#### code in loop

```javascript
index < 10 // run condition, if true, it run! 
```