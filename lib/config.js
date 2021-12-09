const fs=require('fs');
const got=require('got');
const ipfs = require("ipfs-simple");
const ExpectedError=require('./ExpectedError');

let configs={};
const base_folder='_config';
if (!fs.existsSync(base_folder)) fs.mkdirSync(base_folder);
if (!fs.existsSync(base_folder+'/cache')) fs.mkdirSync(base_folder+'/cache');

/**
 * Writes a config file
 * @param {string}  file
 * @param {Object}  data
 */
const write=(file,data)=>{
    fs.writeFileSync(`${base_folder}/${file}`,JSON.stringify(data));
}

/**
 * Reads a config file.  If doesn't exist uses default
 * @param {string}  file
 * @param {Object}  defaultData
 * @return {Object}
 */
const read=(file,defaultData)=>{
    try {
        if ((!fs.existsSync(base_folder)) || (!fs.existsSync(`${base_folder}/${file}`))) return defaultData;
        return JSON.parse(fs.readFileSync(`${base_folder}/${file}`, {encoding: "utf-8"}));
    } catch (e) {
        throw new ExpectedError(`Error loading config file(${file}): ${e.toString()}`);
    }
}



//set defaults
configs["main"]=read("main.json",{
    ignoreList: [                   //list of cids that come with IPFS desktop
        "QmQ2C5V7WN2nQLAQz73URXauENhgTwkZwYXQE56Ymg55dV","QmQ2C5V7WN2nQLAQz73URXauENhgTwkZwYXQE56Ymg55dV","QmT7mPQPpQfA154bioJACMfYD3XBdAJ2BuBFWHkPrpVaAe","QmVUqYFvA9UEGT7vxrNWsKrRpof6YajfLcXJuSHBbLDXgK","QmWCH8fzy71C9CHc5LhuECJDM7dyW6N5QC13auS9KMNYax","QmYMiHk7zBiQ681o567MYH6AqkXGCB7RU8Rf5M4bhP4RjA","QmZxpYP6T4oQjNVJMjnVzbkFrKVGwPkGpJ4MZmuBL5qZso","QmbKUYdu1D8zwJJfBnvxf3LAJav8Sp4SNYFoz3xRM1j4hV","Qmc2ywGVoAZcpkYpETf2CVHxhmTokETMx3AiuywADbBEHY","QmdRmLoFVnEWx44NiK3VeWaz59sqV7mBQzEb8QGVuu7JXp","QmdtLCqzYNJdhJ545PxE247o6AxDmrx3YT9L5XXyddPR1M"
    ],
    quiet:          true,           //should server not output debug lines to console
    includeMedia:   {               //set to false if not to include media
        maxSize:    1000000,        //max file size to accept in bytes.  Default 1MB
        names:      ["icon"],       //comment out line if all names accepted
        mimeTypes:  ["image/png","image/jpg","image/jpeg","image/gif"],  //comment out line if all types accepted
        paid:       "always"        //always include media that i get paid for
    },
    timeout:        1800000,        //max number of ms to look for a ipfs object.  Default 30min
    errorDelay:     600000,         //time to delay before retrying if there is an error 10min
    port:           8090,           //page to see what is stored on your server will be available at http://serverip:port/
    scanDelay:      600000,         //delay in ms between scans for new assets.  Default is 10 min
    sessionLife:    86400000,       //how long sessions last default 24h
    users:          false,          //login credentials - default no credentials.  when credentials are required Object<{salt:string,hash:String}>
    publish:        false
});
configs["lastHeight"]=read("lastHeight.json",0);
configs["approved"]=read("approved.json", {cid:[],assetId:[],cache:[]});
configs["rejected"]=read("rejected.json",{cid:[],assetId:[],cache:[]});
configs["subscriptions"]=read("unsignedSubscriptions.json", {"https://ipfs.digiassetX.com/subscription":{"approved":false,"rejected":true}});
configs["assets"]=read("assets.json",[]);
configs["permanent"]=read("permanent.json",{daily:0,page:0,assets:{}});

//Upgrade Versions <3 to version 3s format
let upgrading=(configs["main"]["messaging"]!==undefined);
if (Array.isArray(configs["approved"])) {
    upgrading=true;
    let cid=configs["approved"];
    configs["approved"]={cid,assetId:[],cache:[]};//cache will get reprocessed after next sync
    write('approved.json',configs["approved"]);
}
if (Array.isArray(configs["rejected"])) {
    upgrading=true;
    let cid=configs["rejected"];
    configs["rejected"]={cid,assetId:[],cache:[]};//cache will get reprocessed after next sync
    write('rejected.json',configs["rejected"]);
}
if (upgrading) {
    delete configs["main"]["messaging"];                                        //remove out dated field
    configs["main"].publish=false;
    if (configs["main"].scanDelay===15000000) {
        configs["main"].scanDelay=600000;
        configs["main"].timeout=1800000;
    } //upgrade to new default if set to default
    write('main.json',configs["main"]);
    configs["lastHeight"]=0;
    try {
        fs.unlinkSync(base_folder+'/lastHeight.json');
    } catch (e) {}
    configs["assets"]=[];
    try {
        fs.unlinkSync(base_folder+'/assets.json');
    } catch (e) {}
}

//external calls
module.exports.get=(type)=>configs[type];
module.exports.set=(type,data)=>{
    write(type+".json",data);
    configs[type]=data;
}


let ipSources=['https://icanhazip.com/','https://api.ipify.org/','https://api6.ipify.org/'];
module.exports.ip=getIP=async()=>{
    for (let ipSource of ipSources) {
        //try 1 at a time until 1 works
        try {
            return (await got.get(ipSource)).body.trim();
        } catch (e) {}
    }
    throw new ExpectedError("failed to get ip address");
}

/**
 * Gets the ipfs peer id
 * @returns {Promise<string>}
 */
module.exports.peerId=async()=>{
    try {
        //get addresses and users ip
        let futureId = ipfs.getId();
        let futureIp = getIP();
        await Promise.all([futureId, futureIp]);
        let {addresses} = await futureId;
        let ip = await futureIp;

        //find addresses that are public
        let possible = [];
        for (let id of addresses) {
            let stringId=id.toString();
            if (stringId.indexOf("tcp") === -1) continue;
            if (stringId.indexOf(ip) === -1) continue;
            possible.push(stringId);
        }
        if (possible.length===0) {
            //we didn't find outside line so lets try constructing ourself
            for (let id of addresses) {
                let parts=id.toString().match(/(^[^\t]*ip[46]\/)([^\/]*)(\/tcp[^\t]*$)/);
                if (parts==null) continue;
                possible.push(parts[1]+ip+parts[3]);
            }
        }

        //pick lowest port
        if (possible.length===1) return possible[0];
        let peerId;
        let lowest=65536;
        for (let id of possible) {
            let port=parseInt(id.match(/tcp\/([0-9]*)\//)[1]);
            if (port<lowest) {
                peerId = id;
                lowest=port;
            }
        }

        //return chosen value
        return peerId;
    } catch (e) {
        fs.appendFileSync('_error.log',"config.js module.exports.peerId\r\n"+e.stack+"\r\n-------------------------------\r\n");
        throw e;
    }
}
