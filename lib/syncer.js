// noinspection JSUnfilteredForInLoop

const config=require('./config');
const mainConfig=config.get("main");
const ipfs=require('ipfs-simple');
const ipfsList=require('./ipfs_lists');
const got=require('got');
const screen=require('./screen');


const sleep=require('sleep-promise');



const lookForNewAssets=async()=>{
    //see where we left off
    let lastHeight=config.get("lastHeight");
    screen[(lastHeight===0)?"red":"green"]("Block Height",lastHeight);

    let data;
    try {
        data = (await got.get("https://ipfs.digiassetX.com/" + lastHeight, {
            responseType: "json",
        })).body;
        screen.log("Got CID list for height: "+lastHeight);
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
                if (await ipfsList.rejectCheck(cid)) continue;

                //download the meta data and pin it
                let success = await ipfs.pinAdd(cid);
                if (!success) continue;
                screen.log("added: " + assetId);

                //if including media then decode and see if any media is included
                if (mainConfig.includeMedia !== false) {
                    let data = (await ipfs.catJSON(cid)).data;
                    if (data.urls !== undefined) {
                        for (let {name, mimeType, url} of data.urls) {
                            //see if file meets criteria to download
                            if ((mainConfig.includeMedia.names !== undefined) && (mainConfig.includeMedia.names.indexOf(name) === -1)) continue;
                            if ((mainConfig.includeMedia.mimeTypes !== undefined) && (mainConfig.includeMedia.mimeTypes.indexOf(mimeType) === -1)) continue;
                            if (url.substr(0, 7) !== 'ipfs://') continue;
                            let mediaCid = url.substr(7);

                            //see if file has been rejected
                            if (await ipfsList.rejectCheck(mediaCid)) continue;

                            //get media size
                            let size = await (ipfs.getSize(mediaCid, mainConfig.timeout));
                            if ((size === undefined) || (size > mainConfig.includeMedia.maxSize)) continue;

                            //meets criteria so download and pin
                            await ipfs.pinAdd(mediaCid);
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
        await sleep(mainConfig.errorDelay);
        return;
    }

    await sleep(mainConfig.scanDelay);
}


(async()=> {
    let finished;
    while (finished!==true) {
        try {
            await ipfs.listPinned();
            finished=true;
        } catch (e) {
            screen.red("IPFS Desktop","Not Responding - Make sure its installed https://docs.ipfs.io/install/ipfs-desktop/");
            //if (finished===undefined) console.log("\x1b[31mIPFS Desktop not responding.  Make sure you have installed https://docs.ipfs.io/install/ipfs-desktop/ \x1b[0m");
            finished=false;
            await sleep(10000);
        }
    }
    screen.green("IPFS Desktop","Running");


    //await ipfs.loaded();
    while (true) {
        await lookForNewAssets();
    }
})().catch((error)=>{
    mainConfig.errorDelay("Syncer Failed");
});