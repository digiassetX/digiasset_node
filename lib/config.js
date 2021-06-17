const fs=require('fs');

let configs={};

/**
 * Writes a config file
 * @param {string}  file
 * @param {Object}  data
 */
const write=(file,data)=>{
    if (!fs.existsSync('_config')) fs.mkdirSync('_config');
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
    ipfsViewer:     ".ipfs.localhost:8080",
    scanDelay:      15000000,       //delay in ms between scans for new assets.  Default is 1000 blocks
    sessionLife:    86400000,       //how long sessions last default 24h
    users:          false,          //login credentials - default no credentials.  when credentials are required Object<{salt:string,hash:String}>
    messaging:      {}              //do not change
});
configs["lastHeight"]=read("lastHeight.json",0);
configs["approved"]=read("approved.json",[]);
configs["rejected"]=read("rejected.json",[]);

module.exports.get=(type)=>configs[type];
module.exports.set=(type,data)=>{
    write(type+".json",data);
    configs[type]=data;
}



