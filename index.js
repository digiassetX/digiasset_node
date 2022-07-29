(async()=> {
    //Print Header
    const screen = require('./lib/screen');
    let args = process.argv;
    for (let arg of args) {
        if (arg === "--log") screen.logMode();
    }

    //try to download prebuilds
    await require("./lib/installer")(`${__dirname}/node_modules/leveldown/prebuilds/`);

    //load file system and ipfs
    let mainConfig=require('./lib/config').get("main");
    const fs = require('fs');
    const ipfs = require("ipfs-simple");
    if ((mainConfig.ipfs===undefined)||(mainConfig.ipfs===true)) {
        await ipfs.create();
    } else {
        ipfs.path=mainConfig.ipfs;
    }

    /**
     * Add Error listener
     */
    const errorHandler = (err) => fs.appendFileSync('_error.log', err.stack + "\r\n-------------------------------\r\n");
    process.on('uncaughtException', errorHandler);
    process.on('unhandledRejection', errorHandler);


    //make sure wallet and stream are initialized
    require('./lib/wallet');
    require('./lib/stream');

    //load api
    require('./lib/api');

    //load syncer
    require('./lib/syncer');
})();