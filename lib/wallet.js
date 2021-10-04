// noinspection JSUnfilteredForInLoop

const maxUTXOs=100;
const syncIfIdell=300000;  //5min
const syncIntervalsIfNotUsed=6;
const changeAddressLabel="temp_change";

const config=require('./config');
const DigiByte=require('digibyte-rpc');
const stream=require('./stream');
const screen=require('./screen');

/**
 * Converts a sat int to string decimal
 * @param {int|BigInt} value
 * @param {int} decimals
 * @return {string}
 */
module.exports.satToDecimal=(value,decimals)=>{
    let str=value.toString();
    if (decimals===0) return str;
    str=str.padStart(decimals+1,"0");
    let periodPoint=str.length-decimals;
    return str.substr(0,periodPoint)+'.'+str.substr(periodPoint);
}

/**
 * Converts Strings to BigInts
 * @param {UTXO[]}    utxos
 * @return {UTXO[]}
 */
const convertUtxoStrings=(utxos)=>{
    for (let utxo of utxos) {
        utxo.value=BigInt(utxo.value);
        if (utxo.assets===undefined) continue;
        for (let asset of utxo.assets) asset.amount=BigInt(asset.amount);
    }
    return utxos;
}

/**
 * @typedef {{
 *     rules:   ?AssetRules,
 *     kyc:     ?KycState,
 *     issuer:  string,
 *     locked:      boolean,
 *     aggregation: "aggregatable"|"hybrid"|"dispersed",
 *     divisibility: int,
 *     metadata:    {
 *         txid:    string,
 *         cid:     string
 *     }[]
 * }}  SimplifiedAssetData
 */

/**
 * Caches an assets data for quick lookup if not cached and return data
 * @param {string}  assetId
 * @param {boolean} useCache
 * @return {SimplifiedAssetData}
 */
module.exports.assetData=assetData=async(assetId,useCache=true)=>{
    let {rules,kyc,issuer,divisibility,metadata,aggregation,locked}=await stream.json(assetId,useCache);
    if (rules!==undefined) rules=rules.pop();   //only keep most recent rules
    return {rules,kyc,issuer,divisibility,metadata,aggregation,locked};
}


/*_____       _             __
 |_   _|     | |           / _|
   | |  _ __ | |_ ___ _ __| |_ __ _  ___ ___
   | | | '_ \| __/ _ \ '__|  _/ _` |/ __/ _ \
  _| |_| | | | ||  __/ |  | || (_| | (_|  __/
 |_____|_| |_|\__\___|_|  |_| \__,_|\___\___|
 */
/**
 * Gets a wallet object if the wallet is on and properly configured
 * @return {Promise<DigiByteRPC>}
 *
 * Expected Errors: "Wallet not set up","Wallet offline or config has changed"
 */
const getWallet=async()=>{
    const {wallet}=config.get("main");
    if (wallet===undefined) throw "Wallet not set up";
    let dgbWallet=new DigiByte(wallet.user,wallet.pass,wallet.host,wallet.port);
    try {
        blockCount=await dgbWallet.getBlockCount();
        screen.green("Wallet","Connected");
    } catch (e) {
        screen.red("Wallet","Offline or misconfigured");
        throw "Wallet offline or config has changed";
    }
    return dgbWallet;
}
let blockCount; //to store block count at wallet request
module.exports.calls=getWallet;


/* _____ _                                          _     _
  / ____| |                                /\      | |   | |
 | |    | |__   __ _ _ __   __ _  ___     /  \   __| | __| |_ __ ___  ___ ___  ___  ___
 | |    | '_ \ / _` | '_ \ / _` |/ _ \   / /\ \ / _` |/ _` | '__/ _ \/ __/ __|/ _ \/ __|
 | |____| | | | (_| | | | | (_| |  __/  / ____ \ (_| | (_| | | |  __/\__ \__ \  __/\__ \
  \_____|_| |_|\__,_|_| |_|\__, |\___| /_/    \_\__,_|\__,_|_|  \___||___/___/\___||___/
                            __/ |
                           |___/
 */

//get change addresses and keep up to date
let changeAddresses=[];
let syncChangeAddressesSyncing=false;   //either false or array of resolve functions
let syncPasses=0;   //0 so will try at first run
let syncChangeAddresses=async()=>{
    if (syncPasses-->0) return;

    //get wallet object
    let wallet;
    try {
        wallet=await getWallet();
    } catch {
        return; //not setup
    }

    //report that its running
    syncChangeAddressesSyncing=[];

    //get list of temp change addresses
    try {
        let addresses = await getAddresses(changeAddressLabel);
        changeAddresses = [];
        for (let address of addresses) {
            if (await wallet.getReceivedByAddress(address) === 0) changeAddresses.push(address);
        }
    } catch (e) {}

    //report that its done
    while (syncChangeAddressesSyncing.length>0) syncChangeAddressesSyncing.pop()();
    syncChangeAddressesSyncing=false;
    syncPasses=syncIntervalsIfNotUsed;
}
// noinspection JSIgnoredPromiseFromCall
syncChangeAddresses();
let syncChangeAddressesTimeout=setTimeout(syncChangeAddresses,syncIfIdell);

/**
 * Resets the change address timeout.
 * If sync in place it will pause until done to prevent a race
 * @return {Promise<void>}
 */
const restartTimeout=async()=>{
    //make sure not already syncing
    if (syncChangeAddressesSyncing!==false) await new Promise(resolve=>syncChangeAddressesSyncing.push(resolve));
    syncPasses=0;
    syncChangeAddressesTimeout.refresh();
}

/**
 * Gets a new change address
 * @return {Promise<string>}
 */
module.exports.getChangeAddress=async()=>{
    //restart timeout or wait for function to finish
    await restartTimeout();

    //return synchronously if can
    if (changeAddresses.length>0) return changeAddresses.pop();

    //create a new address and return
    let wallet=await getWallet();
    return wallet.getNewAddress(changeAddressLabel,"bech32");
}

/**
 * Returns a change address that may not have been used
 * @param address
 */
module.exports.setChangeAddress=(address)=>{
    //if in process of syncing then sync will find the address
    if (syncChangeAddressesSyncing!==false) return;

    //restart timeout
    syncChangeAddressesTimeout.refresh();   //restart timeout
    changeAddresses.push(address);
}

/**
 * Removes an address from the change address list and give it a label
 * @param address
 * @param label
 * @return {Promise<void>}
 */
module.exports.useChangeAddress=async(address,label="")=>{
    //restart timeout or wait for function to finish
    await restartTimeout();

    //change the label on the address
    let wallet=await getWallet();
    await wallet.setLabel(address,label);

    //remove from list if present
    changeAddresses=changeAddresses.filter(addr=>addr!==address);
}











/*            _                               _  __          __   _ _      _
     /\      | |                             | | \ \        / /  | | |    | |
    /  \   __| |_   ____ _ _ __   ___ ___  __| |  \ \  /\  / /_ _| | | ___| |_
   / /\ \ / _` \ \ / / _` | '_ \ / __/ _ \/ _` |   \ \/  \/ / _` | | |/ _ \ __|
  / ____ \ (_| |\ V / (_| | | | | (_|  __/ (_| |    \  /\  / (_| | | |  __/ |_
 /_/    \_\__,_| \_/ \__,_|_| |_|\___\___|\__,_|     \/  \/ \__,_|_|_|\___|\__|
 */




/**
 * Returns an array of addresses
 * @param {string?}  label
 * @param {boolean?} returnLabel
 * @return {Promise<string[]|{address:string,label:string}[]>}
 */
module.exports.getAddresses=getAddresses=async(label,returnLabel=false)=>{
    let wallet=await getWallet();

    //get labels to look up
    let labels=[label];
    if (label===undefined) labels=await wallet.listLabels();

    //get list of addresses
    let addresses=[];
    for (let label of labels) {
        let data=await wallet.getAddressesByLabel(label);
        for (let address in data) {
            if (data[address]["purpose"]==="receive") addresses.push(returnLabel?{address,label}:address);
        }
    }
    return addresses;
}

/**
 * Returns a list of assets in the addresses.  DGB is returned as DigiByte
 * @param {string[]}    addresses
 * @return {Promise<{assetId:string,value:string,decimals:int,cid:?string,rules:boolean,data:SimplifiedAssetData}[]>}
 */
module.exports.getAssets=async(addresses)=>{
    if (addresses.length===0) return [];

    //gather totals
    let dgb=0n;
    let totalAssets={};
    for (let address of addresses) {
        try {
            let utxos=await stream.json(address + "_utxos");
            if (utxos===false) continue; //cached empty file
            for (let {value, assets} of utxos) {
                dgb+=BigInt(value);
                if (assets!==undefined) {
                    for (let {assetId,amount,decimals,cid,rules=false} of assets) {
                        //get extra data
                        let data=await assetData(assetId);

                        //store
                        if (totalAssets[assetId+cid]===undefined) totalAssets[assetId+cid]={assetId,value:0n,decimals,cid,rules,data};
                        totalAssets[assetId+cid].value+=BigInt(amount);
                    }
                }
            }
        } catch (e) {
            //no utxos
        }
    }

    //order as array
    let response=[{assetId:"DigiByte",value:dgb.toString(),decimals:8,rules:false,data:{}}];
    for (let index in totalAssets) {
        let {assetId,value,decimals,cid,rules,data}=totalAssets[index];
        response.push({assetId,value: value.toString(),decimals,cid,rules,data});
    }
    return response;
}

/**
 * Finds an address containing the specified assetId
 * @param {string}  assetId
 * @param {string?} label
 * @returns {Promise<string>}
 */
module.exports.findAsset=async(assetId,label)=>{
    //get addresses
    let addresses=await getAddresses(label);

    //gather totals
    let dgb=0n;
    let totalAssets={};
    for (let address of addresses) {
        try {
            let utxos=await stream.json(address + "_utxos");
            if (utxos===false) continue; //cached empty file
            for (let {value, assets} of utxos) {
                dgb+=BigInt(value);
                if (assets!==undefined) {
                    for (let asset of assets) {
                        if (asset.assetId===assetId) return address;
                    }
                }
            }
        } catch (e) {
            //no utxos
        }
    }
    throw "Asset not found";
}




/**
 * Finds any addresses with funds and without labels and assigns it blank label
 * @return {Promise<int>}
 */
module.exports.findMissing=async()=>{
    let count=0;
    let wallet=await getWallet();
    let utxos=await wallet.listUnspent();
    for (let {address,label} of utxos) {
        if (label===undefined) {
            count++;
            await wallet.setLabel(address,"");
        }
    }
    return count;
}


/**
 * Returns required asset utxo and fills up to limit with coin utxos
 * @param {string}  assetIdNeeded
 * @param {BigInt}  quantityNeeded
 * @param {string?} label   - what label to look for funds in if blank does all
 * @param {int?}    limit   - max number of utxos to accept
 * @return {Promise<AddressUtxoData>}
 */
module.exports.getAssetUTXOs=async(assetIdNeeded,quantityNeeded,label,limit=maxUTXOs)=>{
    let wallet=await getWallet();

    //get utxos we can use
    let labels=(label===undefined)?await wallet.listLabels():[label];
    let assetUTXOs=[];
    let assetCount=0n;
    let coinUTXOs=[];
    for (let label of labels) {
        //get addresses
        let addresses=await getAddresses(label);
        if (addresses.length===0) continue;

        //sort out usable utxos
        for (let address of addresses) {
            try {
                /** @type {AddressUtxoData} */let utxos=await stream.json(address + "_utxos");
                if (utxos===false) continue; //cached empty file
                nextUTXO: for (let utxo of utxos) {
                    if (utxo.txid==="1c34dead6dc74f53aa4fc15a11c25d7ca30be729c905f95f81a79c75bca2090f") {
                        console.log("");
                    }
                    if (utxo.assets===undefined) {

                        //coin utxo
                        coinUTXOs.push(utxo);

                    } else if (assetCount<quantityNeeded) {

                        //asset utxo
                        let count=0n;
                        for (let {assetId,amount} of utxo.assets) {
                            if (assetId!==assetIdNeeded) continue nextUTXO;
                            count+=BigInt(amount);
                        }
                        assetCount+=count;
                        assetUTXOs.push(utxo);

                    }
                }
            } catch (e) {
                //no utxos
            }
        }
    }

    //see if there is enough space to use all the UTXOs
    if (assetUTXOs.length+coinUTXOs.length<limit) return convertUtxoStrings([...assetUTXOs,...coinUTXOs]);

    //not enough space so return the largest coin UTXOs
    coinUTXOs.sort((a,b)=>parseInt(a.value)-parseInt(b.value)); //sort small to large
    while(assetUTXOs.length<limit) assetUTXOs.push(coinUTXOs.pop());     //take from end of coin(biggest) and add to asset utxos
    return convertUtxoStrings(assetUTXOs);
}


/**
 * Gets a signature
 * @param {string}  address
 * @param {string}  message
 * @param {string?} password
 * @return {Promise<string>}
 */
module.exports.getSignature=async(address,message,password)=> {
    let wallet=await getWallet();
    if (password !== undefined) await wallet.walletPassPhrase(password, 60);
    let pkey = await wallet.dumpPrivKey(address);
    return wallet.signMessageWithPrivKey(pkey, message);
}

/**
 * Signs and sends a transaction and returns the txid
 * @param {string}  unsignedHex
 * @param {string?} password
 * @return {Promise<string>}
 */
module.exports.send=async(unsignedHex,password)=>{
    let wallet=await getWallet();
    if (password!==undefined) await wallet.walletPassPhrase(password,60);
    let {hex}=await wallet.signRawTransactionWithWallet(unsignedHex);
    return wallet.sendRawTransaction(hex);
}

/**
 * Signs a transaction and returns the signed transaction
 * @param {string}  unsignedHex
 * @param {string?} password
 * @return {Promise<string>}
 */
module.exports.sign=async(unsignedHex,password)=>{
    let wallet=await getWallet();
    if (password!==undefined) await wallet.walletPassPhrase(password,60);
    let {hex}=await wallet.signRawTransactionWithWallet(unsignedHex);
    return hex;
}




/*_____  _       _         _____  _____   _____    _____      _ _
 |  __ \| |     (_)       |  __ \|  __ \ / ____|  / ____|    | | |
 | |__) | | __ _ _ _ __   | |__) | |__) | |      | |     __ _| | |___
 |  ___/| |/ _` | | '_ \  |  _  /|  ___/| |      | |    / _` | | / __|
 | |    | | (_| | | | | | | | \ \| |    | |____  | |___| (_| | | \__ \
 |_|    |_|\__,_|_|_| |_| |_|  \_\_|     \_____|  \_____\__,_|_|_|___
 */

/**
 * Gets the block count
 * @return {Promise<int>}
 *
 * Expected Errors: "Wallet not set up","Wallet offline or config has changed"
 */
module.exports.getBlockCount=async()=>{
    await getWallet();              //get the wallet object
    return blockCount;              //gets set during above call
}

/**
 * Lists all labels in a wallet
 * @return {Promise<string[]>}
 */
module.exports.listLabels=async()=>(await getWallet()).listLabels();

/**
 * Creates a new address
 * @param {string}  label
 * @param {"legacy"|"bech32"}   type
 * @return {Promise<unknown>}
 */
module.exports.getNewAddress=async(label="",type="bech32")=>(await getWallet()).getNewAddress(label,type);

/**
 * Creates a raw transactions and returns the hex
 * @param {{txid:string,vout:int}[]}  inputs
 * @param {Object<string>[]}          outputs
 * @return {Promise<string>}
 */
module.exports.createRawTransaction=async(inputs,outputs)=>(await getWallet()).createRawTransaction(inputs,outputs);

/**
 * Returns a list of UTXOs but converts to sat standard
 * @param {int}         minConfirms
 * @param {int}         maxConfirms
 * @param {string[]}    addressees
 * @return {Promise<UTXO[]>}
 */
module.exports.listUnspent=async(minConfirms,maxConfirms,addressees)=>{
    let wallet=await getWallet();
    let utxos=await wallet.listUnspent(minConfirms,maxConfirms,addressees);
    for (let utxo of utxos) {
        utxo.value=BigInt(utxo.amount*100000000).toString();
    }
    return utxos;
}

/**
 * Decodes a hex transaction
 * @return {Promise<Object>}
 */
module.exports.decodeRawTransaction=async(hex)=>(await getWallet()).decodeRawTransaction(hex);

/**
 * Sends a hex transaction and returns txid
 * @param {string}  hex
 * @return {Promise<string>}
 */
module.exports.sendRawTransaction=async(hex)=>(await getWallet()).sendRawTransaction(hex);


/* _____ _                              __  __             _ _
  / ____| |                            |  \/  |           (_) |
 | |    | |__   __ _ _ __   __ _  ___  | \  / | ___  _ __  _| |_ ___  _ __
 | |    | '_ \ / _` | '_ \ / _` |/ _ \ | |\/| |/ _ \| '_ \| | __/ _ \| '__|
 | |____| | | | (_| | | | | (_| |  __/ | |  | | (_) | | | | | || (_) | |
  \_____|_| |_|\__,_|_| |_|\__, |\___| |_|  |_|\___/|_| |_|_|\__\___/|_|
                            __/ |
                           |___/
 */
let lastBalance=config.get("main").balance;
const checkBalance=async()=>{
    try {
        let wallet=await getWallet();
        let height=await wallet.getBlockCount();
        let balance=await wallet.getBalance("*",1,false);
        if (balance!==lastBalance) {
            //clear cache
            // noinspection ES6MissingAwait
            stream.clearCache(height);

            //save changed balance
            lastBalance=balance;
            let mainConfig=config.get("main");
            mainConfig.balance=balance;
            config.set("main",mainConfig);
        }
    } catch (e) {
    }
}
// noinspection JSIgnoredPromiseFromCall
checkBalance();
setInterval(checkBalance,60000);