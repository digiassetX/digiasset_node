// noinspection JSUnfilteredForInLoop

const config=require('./config');
const ipfs=require('ipfs-simple');
const got=require('got');
const screen=require('./screen');
const sleep=require('sleep-promise');
const assets=require('./assets');
const apiVersion=require('./api').apiVersion;






/**
 * Looks for new assets
 * @return {Promise<void>}
 */
const lookForNewAssets=async()=>{
    //make copy of config data for the loop
    const mainConfig=config.get("main");
    const rejectedList=config.get("rejected").cache;
    let rejectedCids=[];
    for (let {cid} of rejectedList) rejectedCids.push(cid); //may have duplicates but only effects amount of ram needed and not worth compute cycles

    //see where we left off
    let lastHeight=config.get("lastHeight");
    screen[(lastHeight===0)?"red":"green"]("Block Height",lastHeight);

    let data;
    try {
        let {showOnMap=false,publishPeerId=false,payout}=mainConfig.optIn||{};
        let peerId=undefined;
        if (publishPeerId) {
            let futureId=ipfs.getId();
            let futureIp=config.ip();
            await Promise.all([futureId,futureIp]);
            let {Addresses}=await futureId;
            let ip=await futureIp;
            for (let id of Addresses) {
                if (id.indexOf("tcp")===-1) continue;
                if (id.indexOf(ip)===-1) continue;
                peerId=id;
                break;
            }
        }
        data = (await got.post(`https://ipfs.digiassetX.com/list/${Math.floor(lastHeight/100000)}00000.json`, {
            responseType:   "json",
            json:           {
                height: lastHeight+1,
                version:apiVersion,
                show:   showOnMap,
                peerId, payout
            }
        })).body;
        screen.log("Got CID list for height: "+(lastHeight+1));
    } catch (e) {
        screen.log("Could not get CID list");
        await sleep(mainConfig.errorDelay);
        return;
    }
    try {
        for (let assetId in data) {
            let {height, cids} = data[assetId];
            for (let cid of cids) {
                //see if already rejected
                if (cid==="") continue;
                if (rejectedCids.indexOf(cid)!==-1) continue;

                //download the meta data and pin it
                let success = await ipfs.pinAdd(cid);
                if (!success) continue;
                screen.log("added: " + assetId);
                assets.add(assetId,cid);

                //if including media then decode and see if any media is included
                if (mainConfig.includeMedia !== false) {
                    let data = (await ipfs.catJSON(cid)).data;
                    if (data.urls !== undefined) {
                        for (let {name, mimeType, url} of data.urls) {
                            //see if media on ipfs
                            if (url.substr(0, 7) !== 'ipfs://') continue;

                            //see if file has been rejected already
                            let mediaCid = url.substr(7);
                            if (rejectedCids.indexOf(mediaCid)!==-1) continue;

                            //see if file meets criteria to download
                            if (mainConfig.includeMedia !== true) {
                                //check types
                                if ((mainConfig.includeMedia.names !== true) && (mainConfig.includeMedia.names.indexOf(name) === -1)) continue;
                                if ((mainConfig.includeMedia.mimeTypes !== true) && (mainConfig.includeMedia.mimeTypes.indexOf(mimeType) === -1)) continue;

                                //check size
                                let size = await (ipfs.getSize(mediaCid, mainConfig.timeout));
                                if ((size === undefined) || (size > mainConfig.includeMedia.maxSize)) continue;
                            }

                            //meets criteria so download and pin
                            await ipfs.pinAdd(mediaCid);
                            assets.add(assetId,mediaCid);
                        }
                    }
                }
            }
            lastHeight = height;
            screen.green("Block Height",height);
            config.set("lastHeight",height);
        }
    } catch (e) {
        screen.log("Error trying to pin a cid sleep for: "+Math.ceil(mainConfig.errorDelay/60000)+ " minutes");
        screen.log(e.toString());
        await sleep(mainConfig.errorDelay);
        return;
    }

    //force pause and while waiting rebuild caches
    let scanDelayPromise=sleep(mainConfig.scanDelay);
    try {
        await Promise.all([
            assets.updateCache(),
            scanDelayPromise
        ]);
    } catch (e) {
        screen.log("Error trying to update list caches");
        screen.log(e.toString());
        await scanDelayPromise;
    }
}

/**
 * Waits for IPFS Desktop to come online
 * @return {Promise<void>}
 */
const makeSureIPFSrunning=async()=>{
    while (true) {
        try {
            await ipfs.listPinned();
            return;
        } catch (e) {
            screen.red("IPFS Desktop","Not Responding - Make sure its installed https://docs.ipfs.io/install/ipfs-desktop/");
            await sleep(10000);
        }
    }
}

(async()=> {
    //wait for IPFS to load
    await makeSureIPFSrunning();
    screen.green("IPFS Desktop","Running");

    //start syncing
    // noinspection InfiniteLoopJS
    while (true) {
        await makeSureIPFSrunning();    //make sure IPFS is running before trying to sync
        await lookForNewAssets();       //look for new assets
    }
})().catch((error)=>{
    screen.log(error.toString());
    screen.red("Block Height","Sync System Failed please restart");
});