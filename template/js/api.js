//min_api_version: 3
const api={};

const post=async(url,data)=>{
    return new Promise((resolve,reject)=>{
        $.ajax({
            type: "POST",
            url,
            dataType: "json",
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: (response)=>{
                if (response.error!==undefined) return reject(response.error);
                resolve(response);
            }
        });
    });
}

const get=async(url,data)=>{
    let response=await $.getJSON(url,data);
    if (response.error!==undefined) throw response.error;
    return response;
}

const stream=async(url,data,mimeType,method="POST")=>{
    return new Promise((resolve,reject)=>{
        let oReq = new XMLHttpRequest();
        oReq.open(method, url, true);
        oReq.responseType = "arraybuffer";
        oReq.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

        oReq.onload = function() {
            let arrayBuffer = oReq.response;
            resolve(new Blob([arrayBuffer], {type: mimeType}));
        }
        oReq.onerror = function (e) {
            reject(e);
        }

        oReq.send(JSON.stringify(data));
    });
}

const postFile=async(url,file)=>{
    return new Promise((resolve,reject)=>{
        let formdata = new FormData();
        formdata.append("file", file);
        $.ajax({
            url,
            data: formdata,
            type: "POST",
            cache: false,
            contentType: false,
            processData: false,
            success: (response)=>{
                if (response.error!==undefined) return reject(response.error);
                resolve(response);
            }
        });
    });
}

/*
████████╗ ██████╗ ███████╗
╚══██╔══╝██╔═══██╗██╔════╝
   ██║   ██║   ██║███████╗
   ██║   ██║   ██║╚════██║
   ██║   ╚██████╔╝███████║
   ╚═╝    ╚═════╝ ╚══════╝
 */
api.tos={};
api.tos.get=async()=>get('/api/tos.json');
api.tos.set=async(hash)=>post('/api/tos.json',{hash});

/*
 ██████╗ ██████╗ ██████╗ ███████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝
██║     ██║   ██║██████╔╝███████╗
██║     ██║   ██║██╔══██╗╚════██║
╚██████╗╚██████╔╝██║  ██║███████║
 ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝
 */
/**
 * Gets binary data from web
 * @param {string}  url
 * @param {string}  mimeType
 * @return {Promise<Blob>}
 */
api.cors=async(url,mimeType)=>stream('/api/cors',{url},mimeType);

/*
██╗██████╗ ███████╗███████╗
██║██╔══██╗██╔════╝██╔════╝
██║██████╔╝█████╗  ███████╗
██║██╔═══╝ ██╔══╝  ╚════██║
██║██║     ██║     ███████║
╚═╝╚═╝     ╚═╝     ╚══════╝
 */
api.ipfs={};
/**
 * Gets binary data from ipfs
 * @param {string}  cid
 * @param {string}  mimeType
 * @return {Promise<unknown>}
 */
api.ipfs.stream=async(cid,mimeType)=>stream((await api.config.ipfsViewer.get())+cid,undefined,mimeType,"GET");

/*
██╗   ██╗███████╗███████╗██████╗
██║   ██║██╔════╝██╔════╝██╔══██╗
██║   ██║███████╗█████╗  ██████╔╝
██║   ██║╚════██║██╔══╝  ██╔══██╗
╚██████╔╝███████║███████╗██║  ██║
 ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝
Calls in this section are callable at any time even if not logged in
 */
api.user={};

/**
 * Logs a user in
 * @param {string}  user
 * @param {string}  pass
 * @return {Promise<void>}
 *
 * Expected Errors: "Invalid username or password"
 */
api.user.login=async(user,pass)=>post('/api/user/login.json',{user,pass});

/**
 * Logs a user out if logged in
 * @return {Promise<void>}
 */
api.user.logout=async()=>get('/api/user/logout.json');

/**
 * Returns if a user is logged in or not
 * @return {Promise<boolean>}
 */
api.user.state=async()=>get('/api/user/state.json');


/*
 ██████╗ ██████╗ ███╗   ██╗███████╗██╗ ██████╗
██╔════╝██╔═══██╗████╗  ██║██╔════╝██║██╔════╝
██║     ██║   ██║██╔██╗ ██║█████╗  ██║██║  ███╗
██║     ██║   ██║██║╚██╗██║██╔══╝  ██║██║   ██║
╚██████╗╚██████╔╝██║ ╚████║██║     ██║╚██████╔╝
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝     ╚═╝ ╚═════╝
 */
api.config={};

/*_   _
 | | | |___ ___ _ _
 | |_| (_-</ -_) '_|
  \___//__/\___|_|
 */
api.config.user={};

/**
 * Adds a user to approved list
 * @param {string}  user
 * @param {string}  pass
 * @return {Promise<void>}
 *
 * Expected Errors: "User parameter not set","Pass parameter not set","Username can't be blank","Username already set"
 */
api.config.user.add=async(user,pass)=>post('/api/config/user/add.json',{user,pass});

/**
 * Lists all approved users
 * @return {Promise<string[]>}
 */
api.config.user.list=async()=>get('/api/config/user/list.json');

/**
 * Remove a user from approved list.  Can not remove the last user.
 * @param {string}  user
 * @return {Promise<void>}
 *
 * Expected Errors: "User parameter not set","User does not exist","Can't remove only user"
 */
api.config.user.remove=async(user)=>post('/api/config/user/remove.json',{user});

/*_      __    _ _     _
 \ \    / /_ _| | |___| |_
  \ \/\/ / _` | | / -_)  _|
   \_/\_/\__,_|_|_\___|\__|
*/
api.config.wallet={};

/**
 * Sets core wallet credentials.  Will test if correct and return true if they work
 * @param {string}  user
 * @param {string}  pass
 * @param {string=} host
 * @param {int=}    port
 * @return {Promise<void>}
 *
 * Expected Errors: "User parameter not set","Pass parameter not set","Invalid Credentials"
 */
api.config.wallet.set=async(user,pass,host="127.0.0.1",port=14022)=>post('/api/config/wallet/set.json',{user,pass,host,port});

/**
 * Tries to set core wallet credentials from hard drive data.  Returns true if successful, false if no luck at all and
 * a path if it thinks it found the file but it is not set up
 * @return {Promise<boolean|string>}
 */
api.config.wallet.auto=async()=>get('/api/config/wallet/autoSet.json');

/*___ _
 / __| |_ _ _ ___ __ _ _ __
 \__ \  _| '_/ -_) _` | '  \
 |___/\__|_| \___\__,_|_|_|_|
 */
/**
 * Sets streaming service keys
 * @param {string}  accessKeyId
 * @param {string}  secretAccessKey
 * @return {Promise<void>}
 *
 * Expected Errors: "accessKeyId parameter not set","secretAccessKey parameter not set","Invalid Credentials"
 */
api.config.stream=async(accessKeyId,secretAccessKey)=>post('/api/config/stream.json',{accessKeyId,secretAccessKey});

/*__  __        _ _
 |  \/  |___ __| (_)__ _
 | |\/| / -_) _` | / _` |
 |_|  |_\___\__,_|_\__,_|
 */
api.config.media={};

/**
 * Gets the media config settings
 * @return {Promise<{
 *      maxSize:    int|boolean,
 *      names:      string[]|boolean,
 *      mimeTypes:  string[]|boolean
 *  }|boolean>}
 */
api.config.media.get=async () => get('/api/config/media.json');

/**
 * Sets the media config settings.
 *
 * Set to true for unlimited size and types.
 * Set to false to ignore all included media
 *
 * @param {{
 *      maxSize:    int|boolean,
 *      names:      string[]|boolean,
 *      mimeTypes:  string[]|boolean
 *  }|boolean}  config
 *
 * Expected Errors: "All parameter not set","media.maxSize parameter not set","media.names parameter not set",
 *                  "media.mimeTypes parameter not set","media.maxSize must be an integer or true",
 *                  "media.maxSize must be greater then zero","media.names must be an array of names",
 *                  "media.mimeTypes must be an array of mime types"
 */
api.config.media.set=async (config) => post('/api/config/media.json',{media:config});

/*___      _    _ _    _    _
 | _ \_  _| |__| (_)__| |_ (_)_ _  __ _
 |  _/ || | '_ \ | (_-< ' \| | ' \/ _` |
 |_|  \_,_|_.__/_|_/__/_||_|_|_||_\__, |
                                  |___/
 */
api.config.publishing={};
/**
 * Enables publishing of your approved/reject lists so you can share with other asset nodes.
 * You must reboot the asset node after setting to enable.
 * You must port forward the chosen port to this machine for publishing to work
 * Default is disabled
 *
 * @param {int|boolean} port    - set to port number to enable false to disable
 * @return {Promise<void>}
 *
 * Expected Errors: "port parameter not set","port must be an integer","port must be greater then 1024",
 *                  "port must be less the 65536"
 */
api.config.publishing.set=async(port=false)=>post('/api/config/publishing.json',{port});
api.config.publishing.get=async()=>get('/api/config/publishing.json');

/*___      _               _      _   _
 / __|_  _| |__ ___ __ _ _(_)_ __| |_(_)___ _ _
 \__ \ || | '_ (_-</ _| '_| | '_ \  _| / _ \ ' \
 |___/\_,_|_.__/__/\__|_| |_| .__/\__|_\___/_||_|
                            |_|
 */
api.config.subscription={};
api.config.subscription.add=(url,approved=false,rejected=false)=>post('/api/config/subscription/add.json',{url,approved,rejected});
api.config.subscription.approved=(url,enabled)=>post('/api/config/subscription/approved.json',{url,enabled});
api.config.subscription.rejected=(url,enabled)=>post('/api/config/subscription/rejected.json',{url,enabled});

/*___ ___ ___ ___  __   ___
 |_ _| _ \ __/ __| \ \ / (_)_____ __ _____ _ _
  | ||  _/ _|\__ \  \ V /| / -_) V  V / -_) '_|
 |___|_| |_| |___/   \_/ |_\___|\_/\_/\___|_|
 */
api.config.ipfsViewer={};
api.config.ipfsViewer.get=()=>get('/api/config/ipfsViewer/json');
api.config.ipfsViewer.set=(start)=>post('/api/config/ipfsViewer/json',{start});

/* ___       _     ___
  / _ \ _ __| |_  |_ _|_ _
 | (_) | '_ \  _|  | || ' \
  \___/| .__/\__| |___|_||_|
       |_|
 */
api.config.optIn={};

/**
 * Sets the opt in values
 * @param {boolean} showOnMap
 * @param {boolean} publishPeerId
 * @param {string}  payout
 * @returns {Promise<void>}
 */
api.config.optIn.set=async(showOnMap,publishPeerId,payout="")=>post('/api/config/optIn.json',{showOnMap,publishPeerId,payout});

/**
 * Gets the opt in values
 * @returns {Promise<{
 *     showOnMap:   boolean,
 *     publishId:   boolean,
 *     payout:      string
 * }>}
 */
api.config.optIn.get=async()=>get('/api/config/optIn.json');

/*
██╗   ██╗███████╗██████╗ ███████╗██╗ ██████╗ ███╗   ██╗
██║   ██║██╔════╝██╔══██╗██╔════╝██║██╔═══██╗████╗  ██║
██║   ██║█████╗  ██████╔╝███████╗██║██║   ██║██╔██╗ ██║
╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██║██║   ██║██║╚██╗██║
 ╚████╔╝ ███████╗██║  ██║███████║██║╚██████╔╝██║ ╚████║
  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝
 */
api.version={};

/**
 * Gets a list of available versions
 * @return {Promise<{
 *      compatible:string[],
 *      current:string,
 *      newer:?string[]
 * }>}
 */
api.version.list=async()=>get('/api/version/list.json');

/**
 * Gets current version
 * @return {Promise<string>}
 */
api.version.current=async()=>get('/api/version/current.json');

/**
 * Updates the template version
 * @param {string=} version
 * @return {Promise<void>}
 */
api.version.update=async(version="newest")=>post('/api/version/update.json',{version});

/*
██╗     ██╗███████╗████████╗
██║     ██║██╔════╝╚══██╔══╝
██║     ██║███████╗   ██║
██║     ██║╚════██║   ██║
███████╗██║███████║   ██║
╚══════╝╚═╝╚══════╝   ╚═╝
 */
api.list={};

/**
 * Returns a list of all assets and there cids
 * @return {Promise<{
 *      assetId: string,
 *      cid:string
 * }[]>}
 */
api.list.all=async()=>get('/api/list/all.json');

/**
 * Returns a list of all approved assets and there cids
 * @return {Promise<{
 *      assetId: string,
 *      cid:string
 * }[]>}
 */
api.list.approved=async()=>get('/api/list/approved.json');

/**
 * Returns a list of all unsorted assets and there cids
 * @return {Promise<{
 *      assetId: string,
 *      cid:string
 * }[]>}
 */
api.list.unsorted=async()=>get('/api/list/unsorted.json');

/**
 * Returns a list of all rejected assets and there cids
 * @return {Promise<{
 *      assetId: string,
 *      cid:string
 * }[]>}
 */
api.list.rejected=async()=>get('/api/list/rejected.json');

api.list.subscriptions=async()=>get('/api/list/subscriptions.json');

/*
 ██████╗██╗██████╗
██╔════╝██║██╔══██╗
██║     ██║██║  ██║
██║     ██║██║  ██║
╚██████╗██║██████╔╝
 ╚═════╝╚═╝╚═════╝
 */
api.cid={};

/**
 * Approves a cid
 * @param {string}  assetId
 * @param {string}  cid
 * @return {Promise<void>}
 *
 * Expected Errors: "assetId parameter not set","cid parameter not set"
 */
api.cid.approve=async(assetId,cid)=>post('/api/cid/approve.json',{assetId,cid});

/**
 * Rejects a cid
 * @param {string}  assetId
 * @param {string}  cid
 * @return {Promise<void>}
 *
 * Expected Errors: "assetId parameter not set","cid parameter not set"
 */
api.cid.reject=async(assetId,cid)=>post('/api/cid/reject.json',{assetId,cid});

/**
 * Returns url to view the content
 * @param {string}  cid
 * @return {string}
 */
api.cid.page=(cid)=>'/api/cid/'+cid+'.html';


/**
 * Writes a Blob to IPFS and returns the cid
 * @param {Blob}  data
 * @return {Promise<string>}
 */
api.cid.write=async(data)=>postFile('/api/cid/write',data);

/*
 █████╗ ███████╗███████╗███████╗████████╗██╗██████╗
██╔══██╗██╔════╝██╔════╝██╔════╝╚══██╔══╝██║██╔══██╗
███████║███████╗███████╗█████╗     ██║   ██║██║  ██║
██╔══██║╚════██║╚════██║██╔══╝     ██║   ██║██║  ██║
██║  ██║███████║███████║███████╗   ██║   ██║██████╔╝
╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝   ╚═╝╚═════╝
 */
api.assetId={};

/**
 * Approves an assetId
 * @param {string}  assetId
 * @param {string}  cid
 * @return {Promise<void>}
 *
 * Expected Errors: "assetId parameter not set","cid parameter not set"
 */
api.assetId.approve=async(assetId,cid)=>post('/api/assetId/approve.json',{assetId,cid});

/**
 * Rejects an assetId
 * @param {string}  assetId
 * @param {string}  cid
 * @return {Promise<void>}
 *
 * Expected Errors: "assetId parameter not set","cid parameter not set"
 */
api.assetId.reject=async(assetId,cid)=>post('/api/assetId/reject.json',{assetId,cid});

/*
███████╗██╗   ██╗███╗   ██╗ ██████╗    ██╗  ██╗███████╗██╗ ██████╗ ██╗  ██╗████████╗
██╔════╝╚██╗ ██╔╝████╗  ██║██╔════╝    ██║  ██║██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝
███████╗ ╚████╔╝ ██╔██╗ ██║██║         ███████║█████╗  ██║██║  ███╗███████║   ██║
╚════██║  ╚██╔╝  ██║╚██╗██║██║         ██╔══██║██╔══╝  ██║██║   ██║██╔══██║   ██║
███████║   ██║   ██║ ╚████║╚██████╗    ██║  ██║███████╗██║╚██████╔╝██║  ██║   ██║
╚══════╝   ╚═╝   ╚═╝  ╚═══╝ ╚═════╝    ╚═╝  ╚═╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝
 */
/**
 * Gets the last block height we found an asset in
 * @return {Promise<int|"Loading">}
 */
api.height=async()=>get('/api/last_block.json');

/*
██████╗████████╗██████╗ ███████╗ █████╗ ███╗   ███╗
██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔══██╗████╗ ████║
███████╗   ██║   ██████╔╝█████╗  ███████║██╔████╔██║
╚════██║   ██║   ██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║
███████║   ██║   ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║
╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
 */
api.stream={};

/**
 * Gets a digiassetX DigiAsset Data Stream
 * @param {string}  Key
 * @param {boolean=} useCache
 * @return {Promise<*>}
 *
 * Expected Errors: "Stream not configured","Invalid key"
 */
api.stream.get=async(Key,useCache=true)=>post('/api/stream/get.json',{Key,useCache});

/**
 * Clears the local cache
 * @return {Promise<void>}
 */
api.stream.clearCache=async(height)=>post('/api/stream/clear.json',{height});

/*
██╗    ██╗ █████╗ ██╗     ██╗     ███████╗████████╗
██║    ██║██╔══██╗██║     ██║     ██╔════╝╚══██╔══╝
██║ █╗ ██║███████║██║     ██║     █████╗     ██║
██║███╗██║██╔══██║██║     ██║     ██╔══╝     ██║
╚███╔███╔╝██║  ██║███████╗███████╗███████╗   ██║
 ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝
 */
api.wallet={asset:{},addresses:{},fix:{},build:{},change:{}};

/**
 * Gets the current wallet sync height
 * @return {Promise<int>}
 *
 * Expected Errors: "Wallet not set up","Wallet offline or config has changed"
 */
api.wallet.blockHeight=async()=>get('/api/wallet/height.json');

/**
 * Gets a list of addresses that are in the wallet
 * If stream service is enabled also returns balance, kyc state, and if has issued any assets
 * @param {string?} label
 * @return {Promise<{
 *     label:   string,
 *     address: string,
 *     balance: ?string,
 *     kyc:     ?KycState,
 *     issuance:?string[]
 * }[]>}
 *
 * Expected Errors: "Wallet not set up","Wallet offline or config has changed"
 */
api.wallet.addresses.list=async(label)=>post('/api/wallet/addresses/list.json',{label});

/**
 * Returns a new bech32 address
 * @param {string=} label
 * @param {string=} type
 * @return {Promise<string>}
 *
 * Expected Errors: "Wallet not set up","Wallet offline or config has changed"
 */
api.wallet.addresses.new=async(label="",type="bech32")=>post('/api/wallet/addresses/new.json',{label,type});

/**
 * Gets a list of assets
 * @param {?boolean} byLabel - undefined for all labels
 * @return {Promise<{
 *      label:      string,
 *      assetId:    string,
 *      value:      string,
 *      decimals:   int,
 *      cid:        ?string,
 *      data: {
 *          rules:  ?AssetRules,
 *          kyc:    ?KycState,
 *          issuer: string,
 *          divisibility: int,
 *          metadata: {
 *              txid:    string,
 *              cid:     string
 *          }[]
 *      },
 *      metadata: Object
 * }[]>}
 */
api.wallet.asset.list=async(byLabel)=>get('/api/wallet/asset/list.json',{byLabel});

/**
 * Gets an assets data
 * @param {?string} assetId
 * @return {{
 *     rules:   ?AssetRules,
 *     kyc:     ?KycState,
 *     issuer:  string,
 *     locked:      boolean,
 *     aggregation: int,
 *     divisibility: int,
 *     metadata:    {
 *         txid:    string,
 *         cid:     string,
 *         data:    Object
 *     }
 * }}
 */
api.wallet.asset.json=async(assetId)=>get(`/api/wallet/asset/${assetId}.json`);

/**
 * Gets a list of addresses that can be used to issue an asset
 * @param {boolean=} kyc
 * @param {?string} label - undefined for all labels
 * @return {Promise<{
 *     address:  string,
 *     issuance: string[],
 *     value:    string
 * }[]>}
 */
api.wallet.asset.issuable=async(kyc=true,label)=>get('/api/wallet/asset/issuable.json',{kyc,label});

/**
 * Removes a change address from the pool
 * @param {string}  address
 * @param {string}  label
 * @return {Promise<void>}
 */
api.wallet.change.markUsed=async(address,label="")=>post('/api/wallet/change/use.json',{address,label});

/**
 * Returns the URL needed to complete KYC verification.  All signatures are precomputed for user.
 * If wallet is password protected password is needed.  Otherwise it can be left undefined
 *
 * Options:
 * type: public - no other parameters
 * type: secret - pin is required
 * type: donate - label is required, goal is optional value in sats
 *
 * @param {string[]}  addresses
 * @param {?{
 *     type:    "public"|"donate"|"secret"|"voter",
 *     pin:     ?string,
 *     label:   ?string,
 *     goal:    ?int
 * }}   options
 * @param {?string}  password
 * @return {Promise<string>}
 *
 * Expected Errors: "Wallet not set up","Wallet offline or config has changed","donate type requires a label",
 *                  "donate label must be at least 2 characters","secret type requires a pin",
 *                  "secret pin must be at least 4 characters","Unknown option type","addresses must be an array of string"
 */
api.wallet.kyc=async(addresses,options,password)=>post('/api/wallet/kyc.json',{addresses,password});

/**
 * Returns a list of UTXOs
 * @param {string[]}    addresses
 * @return {Promise<UTXO[]>}
 */
api.wallet.utxos=async(addresses)=>post('/api/wallet/utxos.json',{addresses});

/**
 * Create an asset transaction and get costs
 * @param {Object<int>} recipients
 * @param {string}      assetId
 * @param {?string}     label
 * @param {boolean=}    vote
 * @return {Promise<{
 *     costs:   Object<int>,
 *     hex:     string,
 *     change:  string[]
 * }>}
 */
api.wallet.build.assetTx=async(recipients,assetId,label,vote=false)=>post('/api/wallet/build/assetTx.json', {recipients,assetId,label,vote});

/**
 * Create an asset transaction and get costs
 * @param {Object<int>} recipients
 * @param {string}      address
 * @param {{
 *         divisibility:    int,
 *         locked:          boolean,
 *         aggregation:     "aggregatable"|"hybrid"|"dispersed",
 *         changeAddress:   string,
 *         nodes:           Object<number>,
 *         rules:           AssetRules|boolean
 *     }}   options
 * @param {{
 *         assetName:   string,
 *         issuer:      string,
 *         description: string,
 *         urls:        Url[],
 *         site:        {
 *             url:     string,
 *             type:    "web"|"restricted"
 *         },
 *         encryptions: ?Encryption[],
 *         verifications: ?Object
 *     }}    metadata
 * @param {?string}     password
 * @return {Promise<{
 *     costs:   Object<int>,
 *     hex:     string[],
 *     assetId: string,
 *     cid:     string,
 *     sha256Hash:string,
 *     signed:  boolean
 * }>}
 */
api.wallet.build.assetIssuance=async(recipients,address,options,metadata,password)=>post('/api/wallet/build/assetIssuance.json', {recipients,address,options,metadata,password});

/**
 * Sends a transaction and returns the txid
 * @param {string}              hex
 * @param {?string}             password
 * @return {Promise<string>}
 *
 * Expected Errors: "Wallet not set up","Wallet offline or config has changed",
 */
api.wallet.send=async(hex,password)=>post('/api/wallet/send.json',{hex,password});

/**
 * Sends a transaction and returns the txid
 * @param {string}              hex
 * @return {Promise<string>}
 *
 * Expected Errors: "Wallet not set up","Wallet offline or config has changed",
 */
api.wallet.sendSigned=async(hex)=>post('/api/wallet/sendSigned.json',{hex});

/**
 * Finds any addresses with funds and without labels and assigns it blank label
 * Returns number of changed labels
 * @return {Promise<int>}
 */
api.wallet.fix.labels=async()=>get('/api/wallet/fix/labels.json');

/**
 * Trys to log in with DigiId
 * @param {string}  uri -   digiid://....
 * @param {string}  assetIdOrAddress - assetId site is requesting or address to sign with
 * @param {?string} password - password to unlock wallet
 * @return {Promise<boolean>}
 */
api.wallet.digiId=async(uri,assetIdOrAddress,password,test=false)=>{
    //calculate request for signature
    let data;
    if ((assetIdOrAddress[0]==="L")||(assetIdOrAddress[0]==="U")) {
        data={
            uri,password,test,
            assetId: assetIdOrAddress
        };
    } else {
        data={
            uri,password,test,
            address: assetIdOrAddress
        };
    }

    //Make digi-id request
    let response=await post('/api/wallet/digiId.json',data);
    return (response.address!==undefined);
}

/*
██████╗ ██╗ ██████╗ ██╗██████╗ ██╗   ██╗████████╗███████╗
██╔══██╗██║██╔════╝ ██║██╔══██╗╚██╗ ██╔╝╚══██╔══╝██╔════╝
██║  ██║██║██║  ███╗██║██████╔╝ ╚████╔╝    ██║   █████╗
██║  ██║██║██║   ██║██║██╔══██╗  ╚██╔╝     ██║   ██╔══╝
██████╔╝██║╚██████╔╝██║██████╔╝   ██║      ██║   ███████╗
╚═════╝ ╚═╝ ╚═════╝ ╚═╝╚═════╝    ╚═╝      ╚═╝   ╚══════╝
 */
api.digibyte={};

/**
 * Checks if a DigiByte address is valid or not
 * @param {string}  address
 * @returns {Promise<boolean>}
 */
api.digibyte.checkAddress=async(address)=>post('/api/digibyte/checkAddress.json',{address});


/*
██████╗ ██╗ ██████╗ ██╗ █████╗ ███████╗███████╗███████╗████████╗██╗  ██╗
██╔══██╗██║██╔════╝ ██║██╔══██╗██╔════╝██╔════╝██╔════╝╚══██╔══╝╚██╗██╔╝
██║  ██║██║██║  ███╗██║███████║███████╗███████╗█████╗     ██║    ╚███╔╝
██║  ██║██║██║   ██║██║██╔══██║╚════██║╚════██║██╔══╝     ██║    ██╔██╗
██████╔╝██║╚██████╔╝██║██║  ██║███████║███████║███████╗   ██║   ██╔╝ ██╗
╚═════╝ ╚═╝ ╚═════╝ ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝
 */
api.digiassetX={asset:{}};

/**
 * If getting digiassetX to permanently store your asset metadata this function should be called periodically until you get status 2.
 * Please do not call more then once per minute and stop calling once you get 2 as it will not change after that
 * 0    -   not yet discovered
 * 1    -   discovered
 * 2    -   downloaded and sharing
 * @param {string}  metadata - hex
 * @return {Promise<int>}
 */
api.digiassetX.asset.permanent=async(metadata)=>post('/api/digiassetX/asset/permanent.json',{metadata});



window.api=api;