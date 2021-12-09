// noinspection JSUnfilteredForInLoop

const config=require('./config');
const ipfs=require("ipfs-simple");
const got=require('got');
const screen=require('./screen');
const sleep=require('sleep-promise');
const assets=require('./assets');
const apiVersion=require('./api').apiVersion;
const ExpectedError=require('./ExpectedError');



let permanent = config.get("permanent");
const lookForNewPermanent=async()=>{
    try {
        //get current permanent page
        let {changes,daily,done} = (await got.get(`https://ipfs.digiassetx.com/permanent/${permanent.page}.json`, {responseType: "json"})).body;

        //update permanent state
        for (let id in changes) {
            let [assetId,hash]=id.split("-");
            let cids=changes[id];

            if (permanent.assets[assetId]===undefined) permanent.assets[assetId]={};
            permanent.assets[assetId][hash]=cids;
        }
        if (daily!=="0") permanent.daily=daily;
        if (done) permanent.page++;
        config.set("permanent",permanent);

        //update permanent flags on assets
        let assets=config.get("assets");
        nextAsset:for (let asset of assets) {
            //easy check is assetId not permanent at all
            if (permanent.assets[asset.assetId]===undefined) {
                asset.permanent=false;
                continue;
            }

            //look for the cid on permanent list
            for (let hash in permanent.assets[asset.assetId]) {
                if (permanent.assets[asset.assetId][hash].indexOf(asset.cid)!==-1) {
                    asset.permanent=true;
                    continue nextAsset;
                }
            }

            //not found so not permanent
            asset.permanent=false;
        }
        config.set("assets",assets);
    } catch (e) {
    }
}

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

    /**
     * Downloads values associated with a DigiAsset
     * @param {string}  assetId
     * @param {string[]}cids
     * @param {int}     height
     * @returns {Promise<{pass: boolean, height:int}>}
     */
    const getDigiAsset=async(assetId,cids,height)=>{
        try {
            for (let cid of cids) {
                //see if already rejected
                if (cid === "") continue;
                if (rejectedCids.indexOf(cid) !== -1) continue;

                //download the meta data and pin it
                await sleep(Math.ceil(Math.random()*500));
                let success = await ipfs.pinAdd(cid,mainConfig.timeout);
                if (!success) continue;
                screen.log("added: " + assetId);
                assets.add(assetId, cid,height);

                //if including media then decode and see if any media is included
                if (mainConfig.includeMedia !== false) {
                    let data = (await ipfs.catJSON(cid,mainConfig.timeout)).data;
                    if (data.urls !== undefined) {
                        let hash=ipfs.cidToHash(cid);
                        for (let {name, mimeType, url} of data.urls) {
                            await sleep(Math.ceil(Math.random()*500));

                            //see if media on ipfs
                            if (url.substr(0, 7) !== 'ipfs://') continue;

                            //see if file has been rejected already
                            let mediaCid = url.substr(7);
                            if (rejectedCids.indexOf(mediaCid) !== -1) continue;

                            //see if file meets criteria to download
                            if (mainConfig.includeMedia !== true) {
                                //check types
                                if ((mainConfig.includeMedia.paid==="always")&&(permanent.assets[assetId]!==undefined)&&(permanent.assets[assetId][hash].indexOf(mediaCid)!==-1)) {
                                    //passed no code here
                                } else {
                                    if ((mainConfig.includeMedia.names !== true) && (mainConfig.includeMedia.names.indexOf(name) === -1)) continue;
                                    if ((mainConfig.includeMedia.mimeTypes !== true) && (mainConfig.includeMedia.mimeTypes.indexOf(mimeType) === -1)) continue;
                                }

                                //check size
                                let size = await (ipfs.getSize(mediaCid, mainConfig.timeout));
                                if ((size === undefined) || (size > mainConfig.includeMedia.maxSize)) continue;
                            }

                            //meets criteria so download and pin
                            await ipfs.pinAdd(mediaCid,mainConfig.timeout);
                            assets.add(assetId, mediaCid,height);
                        }
                    }
                }
            }
            return {
                pass: true,
                height,assetId
            }
        } catch (e) {
            return {
                pass: false,
                height,assetId
            }
        }
    }


    //Get list of assets that should be downloaded
    let data;
    try {
        let {showOnMap=false,publishPeerId=false,payout}=mainConfig.optIn||{};
        let peerId=undefined;
        if (publishPeerId) peerId=await config.peerId();
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

    //connect to other nodes(async as timing does not need to be done immediately)
    try {
        got.get(`https://ipfs.digiassetx.com/nodes.json`, {
            responseType: "json"
        }).then(async (response) => {
            let myself=await config.peerId();
            let data = response.body;
            for (let {id} of data) {
                if (id===myself) continue;  //don't try to connect to self
                try {
                    await ipfs.addPeer(id, 30000);  //try to connect to peer but give up after 30 sec
                    await sleep(500);
                } catch (_) {
                }
            }
        });
    } catch (e) {
        screen.log("Could not get node list");
    }

    //download new assets
    try {
        let fails=[];
        let lowestFail=Infinity;
        let futures=[];

        const handleAssetUpdate=async(futures)=>{
            let results=await Promise.all(futures);
            futures.length=0;   //clear array without recreating

            //find highest height that is below lowestFail
            let passHeights=[];
            for (let {pass,height,assetId} of results) {
                if (pass) {
                    passHeights.push(height);
                } else {
                    fails.push(assetId);
                    if (height<lowestFail) lowestFail=height;
                }
            }
            let height=lastHeight;
            for (let h of passHeights) {
                if ((h<lowestFail)&&(h>height)) height=h;
            }

            //save results
            lastHeight = height;
            screen.green("Block Height",height);
            config.set("lastHeight",height);
        }

        for (let assetId in data) {
            let {height, cids} = data[assetId];
            futures.push(getDigiAsset(assetId,cids,height));
            if (futures.length>10) await handleAssetUpdate(futures);
        }
        await handleAssetUpdate(futures);
        if (lowestFail<Infinity) throw new ExpectedError("failed to pin all assets: "+fails.join(','));

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

let portReachable=false;
const checkPort=async()=>{
    if (portReachable) return;
    let peerId=await config.peerId();
    let port=peerId.match(/tcp\/([0-9]*)\//)[1];
    if ((await got.post('https://ipfs.digiassetX.com/reachable.json',{
        responseType:   "json",
        json:           {peerId}
    })).body) {
        screen.green("IPFS Desktop","Running on port "+port);
        portReachable=true;
    } else {
        screen.yellow("IPFS Desktop",`Port ${port} Blocked`);
    }
}

(async()=> {
    //wait for IPFS to load
    await makeSureIPFSrunning();

    //make sure DigiByte Logo is pinned
    try {
        await ipfs.pinAdd("QmSAcz2H7veyeuuSyACLkSj9ts9EWm1c9v7uTqbHynsVbj",600000);
    } catch (e) {}

    //check the port is open
    await checkPort();

    //start syncing
    // noinspection InfiniteLoopJS
    while (true) {
        await makeSureIPFSrunning();    //make sure IPFS is running before trying to sync
        await checkPort();
        await lookForNewPermanent();    //update permanent list
        await lookForNewAssets();       //look for new assets
    }
})().catch((error)=>{
    screen.log(error.toString());
    screen.red("Block Height","Sync System Failed please restart");
});