const config=require('./config');
const AWS=require('aws-sdk');
const screen=require('./screen');
const assetEncoder=require('digiasset-encoder');

//try to initialize on startup
let mainConfig=config.get("main");
let s3;
if (mainConfig.stream!==undefined) {
    s3 = new AWS.S3(mainConfig.stream);
    screen.green("Stream","Connected");
    assetEncoder.initS3(mainConfig.stream);
} else {
    screen.green("Red","Not Configured");
}

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

        //setup asset encoder
        assetEncoder.initS3({accessKeyId,secretAccessKey});
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
 * @return {Promise<ReadStream|stream.Readable>}
 */
module.exports.get=getStream=async(Key)=>(await s3.getObject({Bucket: "chaindata-digibyte",Key,RequestPayer:"requester"})).createReadStream();

/**
 * Gets a json object from stream
 * @param {string}  Key
 * @return {Promise<*>}
 */
module.exports.json=getObject=async(Key)=>JSON.parse(await streamToString(await getStream(Key)));

module.exports.assetEncoder=assetEncoder;