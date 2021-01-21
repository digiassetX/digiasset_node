const config=require('../config/config');
const ipfs=require('./ipfs');
const ipfsList=require('./ipfs_lists');

const AWS=require('aws-sdk');
const s3 = new AWS.S3(config.s3);

const fs=require('fs');
const sleep=require('sleep-promise');


/**
 * Converts a stream to a string
 * @param stream
 * @return {Promise<string>}
 */
const streamToString=async (stream)=>{
    return new Promise(resolve => {
        const chunks = [];

        stream.on("data", chunk => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString()));
    });
}

/**
 *
 * @param {Object}  opts
 * @return {AsyncGenerator<*, void, *>}
 */
async function* listAllKeys(opts) {
    opts = {...opts};
    opts.RequestPayer="requester";
    do {
        const data = await s3.listObjectsV2(opts).promise();
        opts.ContinuationToken = data.NextContinuationToken;
        yield data;
    } while (opts.ContinuationToken)
}

/**
 * Loads a file from s3 and returns json
 * @param {string}  key
 * @return {Promise<Object>}
 */
const loadFile=async (key)=> {
    const bucketParams = {
        Bucket: config.bucket,
        Key: key,
        RequestPayer: "requester"
    };
    let stream = (await s3.getObject(bucketParams)).createReadStream();
    return JSON.parse(await streamToString(stream));
}



const lookForNewAssets=async()=>{
    //see where we left off
    let lastKey="index_asset_8432000";  //first asset key that exists
    try {
        lastKey=fs.readFileSync('config/lastindex.txt').toString('utf8');
    } catch (e) {}
    config.messaging.lastBlock=parseInt(lastKey.split('_').pop());

    //go through each asset that exists
    let opts = {
        Bucket: config.bucket,
        Prefix: "index_asset_"
    };
    let startFound=false;
    for await (const data of listAllKeys(opts)) {
        for (let {Key} of data.Contents) {
            //skip all keys already done
            if ((!startFound)&&(Key!==lastKey)) continue;
            startFound=true;
            
            //download index file
            let indexData=await loadFile(Key);
            console.log("Loading: "+Key+" "+indexData.length);
            for (let {assetId, cid} of indexData) {
                if (cid !== undefined) {
                    //check if it has already been deleted
                    if (await ipfsList.rejectCheck(cid)) continue;

                    //download the meta data and pin it
                    let success = await ipfs.pinAdd(cid);
                    if (!success) continue;
                    console.log("added: " + assetId);

                    //if including media then decode and see if any media is included
                    if (config.includeMedia!==false) {
                        let data=(await ipfs.catJSON(cid)).data;
                        if (data.urls!==undefined) {
                            for (let {name, mimeType, url} of data.urls) {
                                //see if file meets criteria to download
                                if ((config.includeMedia.names !== undefined) && (config.includeMedia.names.indexOf(name) === -1)) continue;
                                if ((config.includeMedia.mimeTypes !== undefined) && (config.includeMedia.mimeTypes.indexOf(mimeType) === -1)) continue;
                                if (url.substr(0, 7) !== 'ipfs://') continue;
                                let mediaCid = url.substr(7);

                                //see if file has been rejected
                                if (await ipfsList.rejectCheck(mediaCid)) continue;

                                //get media size
                                let size = await (ipfs.getSize(mediaCid, config.timeout));
                                if ((size === undefined) || (size > config.includeMedia.maxSize)) continue;

                                //meets criteria so download and pin
                                await ipfs.pinAdd(mediaCid);
                            }
                        }
                    }
                }
            }
            config.messaging.lastBlock=parseInt(Key.split('_').pop());

            //save last index file we read
            fs.writeFileSync('config/lastindex.txt',Key);
        }
    }
}


(async()=> {
    while (true) {
        try {
            console.log("Looking for new assets:")
            await lookForNewAssets();
        } catch (_) {
            console.log("Something went wrong.  This may be poor internet connection or maybe a bad API Key.");
        }
        await sleep(config.scanDelay);
    }
})().catch((error)=>{
    console.log("Syncer Failed");
    console.log(error);
});