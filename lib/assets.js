// noinspection JSUnfilteredForInLoop

const config=require('./config');
const got=require('got');
const ipfs=require('ipfs-simple');
const screen=require('./screen');

/**
 * @typedef {{
 *     assetId: string,
 *     cid:     string
 * }}   acPair
 */

/**
 * Format that _config/approved.json and _config/rejected.json are in
 * @typedef {{
 *      cid:    string[],
 *      assetId:string[],
 *      list:   string[],
 *      cache:  acPair[]
 * }}   acConfig
 */



let searchTables={assetId:{},cid:{}};
/** @type {acPair[]}*/let assets=config.get("assets");
for (let index in assets) {
    for (let ac in searchTables) {
        let valueToIndex=assets[index][ac];
        if (searchTables[ac][valueToIndex]===undefined) searchTables[ac][valueToIndex]=[];  //if first time seeing that value then initialize
        searchTables[ac][valueToIndex].push(index); //add index to search
    }
}

/**
 * Adds an item to the asset list
 * @param {string}  newAssetId
 * @param {string}  newCid
 */
module.exports.add=(newAssetId,newCid)=>{
    //check if already there
    for (let {assetId,cid} of assets) {
        if ((assetId===newAssetId)&&(cid===newCid)) return;
    }

    //add to list
    let index=assets.length;
    let newData={
        assetId:newAssetId,
        cid:newCid
    };
    assets.push(newData);

    //add to search
    for (let ac in searchTables) {
        let valueToIndex=newData[ac];
        if (searchTables[ac][valueToIndex]===undefined) searchTables[ac][valueToIndex]=[];  //if first time seeing that value then initialize
        searchTables[ac][valueToIndex].push(index); //add index to search
    }

    //save
    config.set("assets",assets);
}

/**
 * Recreates the cache portion of approved or rejected list
 * @param {"approved"|"rejected"}type
 * @return {Promise<acConfig>}>}
 */
updateCache=async(type)=>{
    //get config data
    /**@type {acConfig}*/let data=config.get(type);

    //download list and see if there have been any changes
    let totalListData={cid:[],assetId:[]};
    for (let url of data.list) {
        try {
            //download external list
            let listData = (await got.get(url, {
                responseType: "json",
            })).body;

            //copy contents to our internal data removing duplicates
            for (let ac in totalListData) { //ac="assetId" or "cid"
                if (listData[ac]!==undefined) {
                    for (let item of listData[ac]) {
                        if (totalListData[ac].indexOf(item) === -1) totalListData[ac].push(item);
                    }
                }
            }
        } catch (e) {
            //just ignore list for now
        }
    }

    //re get config data to make sure it is up to date
    /** @type {acConfig}*/data=config.get(type);

    //add downloaded list data if applicable
    for (let ac in totalListData) { //ac="assetId" or "cid"
        for (let item of totalListData[ac]) {
            if (data[ac].indexOf(item)===-1) data[ac].push(item);
        }
    }

    //create list of indexes we need to cache
    let indexesToCache=[];
    for (let ac in totalListData) { //ac="assetId" or "cid"
        for (let item of data[ac]) {
            let indexes=searchTables[ac][item];
            for (let index of indexes) {
                if (indexesToCache.indexOf(index)===-1) indexesToCache.push(index);
            }
        }
    }

    //create cache
    data.cache=[];
    for (let index of indexesToCache) data.cache.push(assets[index]);

    //return
    return data;
}

/**
 * Recreates the cache portion of approved or rejected list
 * @return {Promise<void>}
 */
module.exports.updateCache=async()=> {
    //update caches
    let approved=await updateCache("approved");
    let rejected=await updateCache("rejected");

    //build hash table of rejected
    let rejectHashes={};
    for (let {assetId,cid} of rejected.cache) rejectHashes[assetId+cid]=true;   //yah lame hash function but it gives unique and quick

    //remove any duplicates out of approved
    rejected.cache.filter(item => rejectHashes[item.assetId+item.cid]===undefined);

    //save
    config.set("approved",approved);
    config.set("rejected",rejected);

    //make sure all on reject list are unpinned
    for (let {cid} of rejected.cache) await ipfs.pinRemove(cid);
}

/**
 * Adds an item to the cache if not there
 * @param data
 * @param {string}  assetId
 * @param {string}  cid
 */
let addToCache=(data,assetId,cid)=>{
    for (let item of data.cache) {
        if ((item.assetId===assetId)&&(item.cid===cid)) return;
    }
    data.cache.push({assetId,cid});
}

/**
 * Adds an cid to the approve list
 * @param {string}  assetId
 * @param {string}  cid
 */
module.exports.approveCid=(assetId,cid)=>{
    /**@type {acConfig}*/let data=config.get("approved");
    if (data.cid.indexOf(cid)===-1) {
        data.cid.push(cid);
        addToCache(data,assetId,cid);
        config.set("approved",data);
    }
}

/**
 * Adds an assetId to the approve list
 * @param {string}  assetId
 * @param {string}  cid
 */
module.exports.approveAssetId=(assetId,cid)=>{
    /**@type {acConfig}*/let data=config.get("approved");
    if (data.assetId.indexOf(assetId)===-1) {
        data.assetId.push(assetId);
        addToCache(data,assetId,cid);
        config.set("approved",data);
    }
}

/**
 * Adds an cid to the reject list
 * @param {string}  assetId
 * @param {string}  cid
 */
module.exports.rejectCid=(assetId,cid)=>{
    /**@type {acConfig}*/let data=config.get("rejected");
    if (data.cid.indexOf(cid)===-1) {
        data.cid.push(cid);
        addToCache(data,assetId,cid);
        config.set("rejected",data);
        ipfs.pinRemove(cid);
    }
}

/**
 * Adds an assetId to the approve list
 * @param {string}  assetId
 * @param {string}  cid
 */
module.exports.rejectAssetId=(assetId,cid)=>{
    /**@type {acConfig}*/let data=config.get("rejected");
    if (data.assetId.indexOf(assetId)===-1) {
        data.assetId.push(assetId);
        addToCache(data,assetId,cid);
        config.set("rejected",data);
        ipfs.pinRemove(cid);
    }
}


/**
 *
 * @type {{
 *      all: (function(): acPair[]),
 *      unsorted: (function(): acPair[]),
 *      approved: (function(): acPair[]),
 *      rejected: (function(): acPair[])
 * }}
 */
module.exports.list={
    all:        ()=>config.get("assets"),
    approved:   ()=>config.get("approved").cache,
    rejected:   ()=>config.get("rejected").cache,
    unsorted:   ()=>{
        //create list of cids that should not be included in the unsorted list
        let sorted=[...config.get("approved").cache,...config.get("rejected").cache];
        let sortedCIDs=[];
        for (let {cid} of sorted) sortedCIDs.push(cid);

        //remove any with cids in list and return
        return assets.filter(line => sortedCIDs.indexOf(line.cid)===-1);
    }
};


//startup http server
const mainConfig=config.get("main");
if (mainConfig.publish!==false) {
    //load express
    const express = require('express');
    const app = express();
    const bodyParser = require("body-parser");
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    //watch for either /approved.json or /rejected.json
    app.get('/:ar.json',async(req,res)=>{
        try {
            const {ar}=req.params;
            if ((ar!=="approved")||(ar!=="rejected")) throw "Invalid request";

            let {assetId,cid}=config.get(ar);

            //return data
            res.status(200).end({assetId,cid});
        } catch (_) {
            res.status(404);
        }
    });

    //start listening on port
    app
        .listen(mainConfig.publish, async() => {
            let ipSources=['https://icanhazip.com/','https://api.ipify.org/','https://api6.ipify.org/'];
            let prefix="Running on port ";
            for (let ipSource of ipSources) {
                //try 1 at a time until 1 works
                try {
                    prefix='Running at http://'+(await got.get(ipSource)).body+':';
                    break;
                } catch (e) {}
            }
            screen.green("List Publishing", prefix+mainConfig.publish);
        })
        .on('error', () => screen.red("List Publishing", "Failed to load"));
} else {
    screen.green("List Publishing", `Disabled`);
}