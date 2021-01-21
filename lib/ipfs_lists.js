const ipfs=require('./ipfs');
const fsPromises=require('fs').promises;
/**
 * Returns list of all pinned cids
 * @return {Promise<string[]>}
 */
module.exports.all=async()=>{
    let data = (await ipfs.listPinned()).Keys;
    let cids = [];
    for (let index in data) cids.push(index);
    return cids;
}

/**
 * Returns list of all approved cids
 * @return {Promise<string[]>}
 */
module.exports.approved=approved=async()=>{
    try {
        let string=(await fsPromises.readFile('config/approved.json')).toString('utf8');
        return JSON.parse(string);
    } catch (_) {
        return [];
    }
}


/**
 * Adds cid to approved list.  returns false if already there
 * @param {string} cid
 * @return {Promise<boolean>}
 */
module.exports.addApprove=async(cid)=>{
    let approvedList=await approved();
    if (approvedList.indexOf(cid)!==-1) return false; //already there
    approvedList.push(cid);
    await fsPromises.writeFile('config/approved.json',JSON.stringify(approvedList),{encoding:'utf8'});
    return true;
}

/**
 * Returns list of all rejected cids
 * @return {Promise<string[]>}
 */
module.exports.rejected=rejected=async()=>{
    try {
        let string=(await fsPromises.readFile('config/rejected.json')).toString('utf8');
        return JSON.parse(string);
    } catch (_) {
        return [];
    }
}

/**
 * Returns if a cid has been rejected
 * @param {string} cid
 * @return {Promise<boolean>}
 */
module.exports.rejectCheck=async(cid)=>{
    let rejectedList=await rejected();
    return (rejectedList.indexOf(cid)!==-1);
}



/**
 * Adds cid to reject list.  returns false if already there
 * @param {string} cid
 * @return {Promise<boolean>}
 */
module.exports.addReject=async(cid)=>{
    //update reject file
    let rejectedList=await rejected();
    if (rejectedList.indexOf(cid)!==-1) return false; //already there
    rejectedList.push(cid);
    await fsPromises.writeFile('config/rejected.json',JSON.stringify(rejectedList),{encoding:'utf8'});

    //remove file
    await ipfs.pinRemove(cid);

    return true;
}