const fs=require('fs');

/**
 * Add Error listener
 */
const errorHandler=(err)=>fs.appendFileSync('_error.log',err.stack+"\r\n-------------------------------\r\n");
process.on('uncaughtException', errorHandler);
process.on('unhandledRejection', errorHandler);




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