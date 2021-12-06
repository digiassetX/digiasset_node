const config=require('./config');
const AWS=require('aws-sdk');
const screen=require('./screen');
const assetEncoder=require('digiasset-encoder');
const fs=require('fs');
const LimitParallel=require('limit-parallel');
const ExpectedError=require('./ExpectedError');
const crypto = require("crypto");
const got=require("got");
const sleep=require("sleep-promise");



/**
 * From https://stackoverflow.com/questions/17699599/node-js-check-if-file-exists
 * @param {string}  path
 * @return {Promise<boolean>}
 */
const fsFileExists=async path => !!(await fs.promises.stat(path).catch(_ => false));

/**
 * Tests and saves stream api keys
 * @param {{accessKeyId:string,secretAccessKey:string}} options
 * @return {Promise<void>}
 */
module.exports.config=async(options)=>{
    const {accessKeyId,secretAccessKey} = options;
    if (accessKeyId===undefined) throw new ExpectedError("accessKeyId parameter not set");
    if (secretAccessKey===undefined) throw new ExpectedError("secretAccessKey parameter not set");
    s3 = new AWS.S3({accessKeyId,secretAccessKey,region: "ca-central-1"});
    try {
        //try to load current block height as test
        let stream = await getStream("height",false);
        await streamToString(stream,true);
    } catch (e) {
        throw new ExpectedError("Invalid Credentials");
    }

    //update and save config
    let mainConfig=config.get("main");
    mainConfig.stream={accessKeyId,secretAccessKey};
    config.set("main",mainConfig);
    screen.green("Stream","Connected");
    fastClear();
}

/**
 * Converts a stream to a string
 * @param {stream.Readable}  stream
 * @param {boolean} testing - always false or not included
 * @return {Promise<string>}
 */
const streamToString=async (stream,testing=false)=>{
    if ((!testing)&&(mainConfig.stream===undefined)) throw new ExpectedError("Stream not configured");
    return new Promise((resolve,reject) => {
        const chunks = [];
        // noinspection JSUnresolvedFunction
        stream.on('error', (error)=>reject(error));
        // noinspection JSUnresolvedFunction
        stream.on("data", chunk => chunks.push(chunk));
        // noinspection JSUnresolvedFunction
        stream.on("end", () => resolve(Buffer.concat(chunks).toString()));
    });
}

/**
 * Gets a stream from digiassetX
 * @param {string}  Key
 * @param {boolean} useCache
 * @return {Promise<ReadStream|stream.Readable>}
 */
module.exports.get=getStream=async(Key,useCache=true)=>{
    const localPath='_config/cache/stream_'+Key;

    //handle special case of height
    if (Key==="height") {
        return (await s3.getObject({
            Bucket: "chaindata-digibyte",
            Key,
            RequestPayer: "requester"
        })).createReadStream();
    }

    //make sure local cache exists
    if (                                           //redownload if any are true:
        (!useCache)||                                   //useCache was disabled
        (!await fsFileExists(localPath))                //there is no cache
    ) {
        await new Promise(async(resolve,reject)=> {
            try {
                let stream = (await s3.getObject({
                    Bucket: "chaindata-digibyte",
                    Key,
                    RequestPayer: "requester"
                })).createReadStream();
                let writeStream = fs.createWriteStream(localPath);
                let started = false;
                stream.on('error', (_) => {
                    if (started) {
                        //didn't finish so delete file
                        writeStream.end();
                        fs.unlinkSync(localPath);
                    } else {
                        //file empty
                        writeStream.write('false', 'utf-8');
                        writeStream.end();
                    }
                    resolve();
                });
                stream.on('data', (chunk) => {
                    started = true;
                    writeStream.write(chunk);
                });
                stream.on('end', () => {
                    writeStream.end();
                    resolve();
                });
            } catch (e) {
                fs.appendFileSync('_error.log',"stream.js module.exports.get\r\n"+e.stack+"\r\n-------------------------------\r\n");
                reject(e);
            }
        });
    }

    //use local
    // noinspection JSValidateTypes
    return fs.createReadStream(localPath);
}

const tryToDelete=(path)=>new Promise(async(resolve) => {
    fs.promises.unlink("_config/cache/"+path).then(resolve,resolve);
});


/**
 * Completely clears the cache
 * @returns {Promise<void>}
 */
module.exports.fullCacheClear=async()=>{
    //wait for height
    if (clearWaiting===undefined) {
        //first attempt
        clearWaiting=[];

        //lookup sha256 of files
        let filePaths = await fs.promises.readdir("_config/cache");
        let limiter = new LimitParallel(20);
        for (let path of filePaths) {
            await limiter.add(tryToDelete(path));
        }
        await limiter.finish();

        //call all waiting functions
        while (clearWaiting.length>0) clearWaiting.pop()(); //pop and run the resolve

        //clear waiting list
        clearWaiting=undefined;

    } else {
        //all others just wait for it to finish
        new Promise(resolve => clearWaiting.push(resolve));
    }
}

let clearDelay=30000;
let clearWaiting;
(async()=>{
    while (true) {
        //wait for clear delay and progressively make clear delay longer
        await sleep(clearDelay);
        clearDelay+=30000;
        if (clearDelay>86400000) clearDelay=86400000;//max 1 day

        //wait for height
        if (clearWaiting === undefined) {
            //first attempt
            clearWaiting = [];

            //lookup sha256 of files
            let filePaths = await fs.promises.readdir("_config/cache");
            let limiter = new LimitParallel(5);
            for (let path of filePaths) {
                if (path.substr(0, 7) !== "stream_") continue;
                await limiter.add(new Promise(async (resolve) => {
                    //slight delay to prevent hammering
                    await sleep(Math.ceil(Math.random()*200)+1);

                    //load file
                    let data = await fs.promises.readFile("_config/cache/" + path);

                    //compute hash
                    let haveHash = crypto.createHash('sha256').update(data).digest('hex');

                    //check if correct
                    let newestHash = (await got.get(`https://ipfs.digiassetX.com/hashes/${path.substr(7)}`)).body;
                    if (newestHash === "0") return resolve(); //never been changed since hash system put in

                    //delete file if not matching
                    if (haveHash !== newestHash) await fs.promises.unlink("_config/cache/" + path);

                    //return
                    resolve();
                }));
            }
            await limiter.finish();

            //call all waiting functions
            while (clearWaiting.length > 0) clearWaiting.pop()(); //pop and run the resolve

            //clear waiting list
            clearWaiting = undefined;

        } else {
            //all others just wait for it to finish
            new Promise(resolve => clearWaiting.push(resolve));
        }
    }
})();


const fastClear=()=>{
    clearDelay=30000;
}
module.exports.fastClear=fastClear;

/**
 * Gets a json object from stream
 * @param {string}  Key
 * @param {boolean} useCache
 * @return {Promise<*>}
 */
module.exports.json=getObject=async(Key,useCache=true)=>JSON.parse(await streamToString(await getStream(Key,useCache)));

module.exports.assetEncoder=assetEncoder;








//try to initialize on startup
assetEncoder.initS3(getObject);
let mainConfig=config.get("main");
let s3;
if (mainConfig.stream!==undefined) {
    s3 = new AWS.S3({
        accessKeyId: mainConfig.stream.accessKeyId,
        secretAccessKey: mainConfig.stream.secretAccessKey,
        region: "ca-central-1"
    });
    screen.green("Stream","Connected");
} else {
    screen.green("Red","Not Configured");
}