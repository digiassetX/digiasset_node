const config=require('./config');

const ipfs=require('ipfs-simple');
const fsPromises=require('fs').promises;
const {ignoreList}=config.get("main");

/**
 * Returns list of all pinned cids
 * @return {Promise<string[]>}
 */
module.exports.all=async()=>{
    return Object.keys(await ipfs.listPinned()).filter(cid => ignoreList.indexOf(cid)===-1);
}

/**
 * Returns list of all approved cids
 * @return {Promise<string[]>}
 */
module.exports.approved=approved=async()=>{
    try {
        return config.get("approved");
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
    config.set("approved",approvedList);
    return true;
}

/**
 * Returns list of all rejected cids
 * @return {Promise<string[]>}
 */
module.exports.rejected=rejected=async()=>{
    try {
        return config.get("rejected");
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
    config.set("rejected",rejectedList);

    //remove file
    await ipfs.pinRemove(cid);

    return true;
}