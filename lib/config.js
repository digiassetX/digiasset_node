const fs=require('fs');
if (!fs.existsSync('_config')) fs.mkdirSync('_config');
if (!fs.existsSync('_config/cache')) fs.mkdirSync('_config/cache');

let configs={};

/**
 * Writes a config file
 * @param {string}  file
 * @param {Object}  data
 */
const write=(file,data)=>{
    fs.writeFileSync('_config/'+file,JSON.stringify(data));
}

/**
 * Reads a config file.  If doesn't exist uses default
 * @param {string}  file
 * @param {Object}  defaultData
 * @return {Object}
 */
const read=(file,defaultData)=>{
    if ((!fs.existsSync('_config'))||(!fs.existsSync('_config/'+file))) return defaultData;
    return JSON.parse(fs.readFileSync('_config/'+file,{encoding: "utf-8"}));
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
        mimeTypes:  ["image/png","image/jpg","image/gif"]   //comment out line if all types accepted
    },
    timeout:        6000000,        //max number of ms to look for a ipfs object.  Default 100min
    errorDelay:     600000,         //time to delay before retrying if there is an error 10min
    port:           8090,           //page to see what is stored on your server will be available at http://serverip:port/
    ipfsViewer:     "http://ipfs.localhost:8080/ipfs/",
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
    configs["main"].ipfsViewer="http://ipfs.localhost:8080/ipfs/";
    if (configs["main"].scanDelay===15000000) configs["main"].scanDelay=600000; //upgrade to new default if set to default
    write('main.json',configs["main"]);
    configs["lastHeight"]=0;
    try {
        fs.unlinkSync('_config/lastHeight.json');
    } catch (e) {};
}

//external calls
module.exports.get=(type)=>configs[type];
module.exports.set=(type,data)=>{
    write(type+".json",data);
    configs[type]=data;
}



