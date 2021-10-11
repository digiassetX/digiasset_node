const config=require('./config');
const AWS=require('aws-sdk');
const screen=require('./screen');
const assetEncoder=require('digiasset-encoder');
const fs=require('fs');
const LimitParallel=require('limit-parallel');
const ExpectedError=require('./ExpectedError');



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
 * Erases the entire cache folder
 * @param {int} height
 */
module.exports.clearCache=async(height=0)=>{
    //make sure clear is set to highest height if already set to clear
    if ((clearAtHeight||-1)<height) clearAtHeight=height;

    //wait for height
    if (clearWaiting===undefined) {
        //first attempt
        clearWaiting=[];

        //wait to reach clear at height
        while (await getStream("height")<clearAtHeight) await sleep(60000);

        //clear
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
        clearAtHeight=undefined;

    } else {
        //all others just wait for it to finish
        new Promise(resolve => clearWaiting.push(resolve));
    }
}
let clearAtHeight;
let clearWaiting;

/**
 * Gets if a clear operation is pending
 * @returns {int|boolean}
 */
module.exports.clearPending=()=>(clearAtHeight!==undefined);

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