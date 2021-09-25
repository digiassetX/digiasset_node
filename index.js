//Print Header
const screen=require('./lib/screen');
let args=process.argv;
for (let arg of args) {
    if (arg==="--log")  screen.logMode();
}

//make sure wallet and stream are initialized
require('./lib/wallet');
require('./lib/stream');

//load api
require('./lib/api');

//load syncer
require('./lib/syncer');