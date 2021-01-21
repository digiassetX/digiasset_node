const got=require('got');
const FormData = require('form-data');
const CID = require('cids');
const fsPromises=require('fs').promises;
const base='http://127.0.0.1:5001/api/v0/';


/**
 * converts a cid in to a hash
 * @param {string}  cidString
 * @return {string}
 */
module.exports.cidToHash=cidToHash=(cidString)=>{
    const cid = new CID(cidString);
    //get hash
    let hash = "";
    for (let i = 4; i < 36; i++) hash += cid.bytes[i].toString(16).padStart(2, '0');

    return hash;
}

/**
 * converts a hash in to a cid
 * @param {string}  hash
 * @return {string}
 */
module.exports.hashToCid=hashToCid=(hash)=>{
    const hashPrefix="1220";
    // noinspection JSCheckFunctionSignatures
    const cid = new CID(1, 'raw', Uint8Array.from(Buffer.from(hashPrefix+hash,'hex')));
    return cid.toString();
}

/**
 * Pins a file returns if successful
 * @param {string}  cid
 * @return {Promise<boolean>}
 */
module.exports.pinAdd=async(cid)=>{
    let url=base+'pin/add/'+cid;
    let pins=JSON.parse((await got.post(url)).body);
    return true;    //TODO if fails will run forever need to add code to add timeout
}

/**
 * Unpin a file
 * @param {string}  cid
 * @return {Promise<boolean>}
 */
module.exports.pinRemove=async(cid)=>{
    //remove pin
    let url=base+'pin/rm/'+cid;
    JSON.parse((await got.post(url)).body);

    //colect garbage
    url=base+'repo/gc';
    JSON.parse((await got.post(url)).body);
    return true;
}


/**
 * Returns the data in an object
 * @param {string}  cid
 * @return {Promise<string>}
 */
module.exports.cat=cat=async(cid)=>{
    let url=base+'cat/'+cid;
    return (await got.post(url)).body;
}

/**
 * Returns the json data in an object
 * @param {string}  cid
 * @return {Promise<string>}
 */
module.exports.catJSON=catJSON=async(cid)=>JSON.parse(await cat(cid));


/**
 * Adds a json file and returns its cid
 * @param {string}  fileName
 * @return {Promise<string>}
 */
module.exports.addFile=addFile=async(fileName)=>{
    let form = new FormData();
    let data=await fsPromises.readFile(fileName);

    form.append('path', Buffer.from(data));

    let url=base+'add?hash=sha2-256&pin=true&cid-version=1';
    let response=(await got.post(url,{
        headers: form.getHeaders(),
        body: form
    })).body;
    return JSON.parse(response).Hash;
}

/**
 * Adds a json file and returns its cid
 * @param {Object}  json
 * @return {Promise<string>}
 */
module.exports.addRawJSON=async(json)=>{
    let form = new FormData();
    form.append('path', Buffer.from(JSON.stringify(json),'utf8'));

    let url=base+'add?pin=true&raw-leaves=true&hash=sha2-256';
    let response=(await got.post(url,{
        headers: form.getHeaders(),
        body: form
    })).body;
    return JSON.parse(response).Hash;
}

/**
 * Returns if a cid is pinned or not
 * @param {string}  cid
 * @return {Promise<boolean>}
 */
module.exports.checkPinned=async(cid)=>{
    let url=base+'pin/ls/'+cid;
    let response=JSON.parse((await got.post(url)).body);
    return (response.Type===undefined); //Type will equal "error" if not pinned and be not present if pinned
}

/**
 * Returns list of pids
 * @return {Promise<boolean>}
 */
module.exports.listPinned=async()=>{
    let url=base+'pin/ls';
     return JSON.parse((await got.post(url)).body);
}

/**
 * Gets the size of a file in bytes.  returns undefined if file was not found
 * @param {string}  cid
 * @param {int} timeout
 * @return {Promise<undefined|int>}
 */
module.exports.getSize=async(cid,timeout=undefined)=>{
    try {
        let url = base + 'object/stat/' + cid;
        let response = (await got.post(url, {
            headers: form.getHeaders(),
            body: form,
            timeout
        })).body;
        return JSON.parse(response).DataSize;
    } catch (_) {
        return undefined;
    }
}

