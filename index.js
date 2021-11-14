const fs=require('fs');

//Print Header
const screen=require('./lib/screen');
let args=process.argv;
for (let arg of args) {
    if (arg==="--log")  screen.logMode();
}
require('./lib/api');
require('./lib/syncer');