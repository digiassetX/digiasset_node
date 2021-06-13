// noinspection JSUnfilteredForInLoop

const config=require('../config/config');
const ipfs=require('ipfs-simple');
const ipfsList=require('./ipfs_lists');
const got=require('got');


const fs=require('fs');
const sleep=require('sleep-promise');




const lookForNewAssets=async()=>{
    //see where we left off
    config.messaging.lastBlock=0;  //first asset key that exists
    try {
        config.messaging.lastBlock=JSON.parse(fs.readFileSync('config/lastindex.txt',{encoding:"utf8"}));
    } catch (e) {
        config.messaging.lastBlock=0;
    }

    let data;
    try {
        data = (await got.get("https://ipfs.digiassetX.com/" + config.messaging.lastBlock, {
            responseType: "json",
        })).body;
        console.log("Got CID list for height: "+config.messaging.lastBlock);
    } catch (e) {
        console.log("Could not get CID list");
        await sleep(config.errorDelay);
        return;
    }
    try {
        for (let assetId in data) {
            console.log("Processing asset: "+assetId);
            let {height, cids} = data[assetId];
            for (let cid of cids) {
                //see if already rejected
                if (cid==="") continue;
                if (await ipfsList.rejectCheck(cid)) continue;

                //download the meta data and pin it
                console.log("Trying to pin: "+cid);
                let success = await ipfs.pinAdd(cid);
                if (!success) continue;
                console.log("added: " + assetId);

                //if including media then decode and see if any media is included
                if (config.includeMedia !== false) {
                    let data = (await ipfs.catJSON(cid)).data;
                    if (data.urls !== undefined) {
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
            config.messaging.lastBlock = height;
            fs.writeFileSync('config/lastindex.txt', JSON.stringify(height));
            console.log("Height updated to: " + height);
        }
    } catch (e) {
        console.log("Failed pin cid");
        await sleep(config.errorDelay);
        return;
    }

    await sleep(config.scanDelay);
}


(async()=> {
    //await ipfs.loaded();
    while (true) {
        await lookForNewAssets();
    }
})().catch((error)=>{
    console.log("Syncer Failed");
    console.log(error);
});