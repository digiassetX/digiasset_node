const config=require('./config');
const AWS=require('aws-sdk');
const screen=require('./screen');
const assetEncoder=require('digiasset-encoder');
const fs=require('fs');
const LimitParallel=require('limit-parallel');



/**
 * From https://stackoverflow.com/questions/17699599/node-js-check-if-file-exists
 * @param {string}  path
 * @return {Promise<boolean>}
 */
const fsFileExists=async path => !!(await fs.promises.stat(path).catch(e => false));

/**
 * Tests and saves stream api keys
 * @param {{accessKeyId:string,secretAccessKey:string}} options
 * @return {Promise<void>}
 */
module.exports.config=async(options)=>{
    const {accessKeyId,secretAccessKey} = options;
    if (accessKeyId===undefined) throw "accessKeyId parameter not set";
    if (secretAccessKey===undefined) throw "secretAccessKey parameter not set";
    s3 = new AWS.S3({accessKeyId,secretAccessKey});
    try {
        //try to load current block height as test
        let stream = await getStream("height");
        await streamToString(stream);
    } catch (e) {
        throw "Invalid Credentials";
    }

    //update and save config
    let mainConfig=config.get("main");
    mainConfig.stream={accessKeyId,secretAccessKey};
    config.set("main",mainConfig);
    screen.green("Stream","Connected");
}

/**
 * Converts a stream to a string
 * @param {ReadStream|stream.Readable}  stream
 * @return {Promise<string>}
 */
const streamToString=async (stream)=>{
    if (mainConfig.stream===undefined) throw "Stream not configured";
    return new Promise((resolve,reject) => {
        const chunks = [];
        stream.on('error', (error)=>reject(error));
        stream.on("data", chunk => chunks.push(chunk));
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
    const localPath='_config/cache/'+Key;

    //make sure local cache exists
    if ((!useCache)||(Key==="height")||(!await fsFileExists(localPath))) {
        await new Promise(async(resolve,reject)=> {
            let stream = (await s3.getObject({
                Bucket: "chaindata-digibyte",
                Key,
                RequestPayer: "requester"
            })).createReadStream();
            let writeStream = fs.createWriteStream(localPath);
            let started = false;
            stream.on('error', (error) => {
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
            stream.on('end', ()=>{
                writeStream.end;
                resolve();
            });
        });
    }

    //use local
    return fs.createReadStream(localPath);
}

/**
 * Erases the entire cache folder
 */
module.exports.clearCache=async()=>{
    let filePaths = await fs.promises.readdir("_config/cache");
    let limiter = new LimitParallel(20);
    for (let path of filePaths) {
        await limiter.add(fs.promises.unlink("_config/cache/"+path));
    }
    await limiter.finish();
}

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
    s3 = new AWS.S3(mainConfig.stream);
    screen.green("Stream","Connected");
} else {
    screen.green("Red","Not Configured");
}