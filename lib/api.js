// noinspection JSUnfilteredForInLoop

const apiVersion=3;    //if changing interface in this file update /template/js/api.js to match
const apiMinVersion=3;
module.exports.apiVersion=apiVersion;

const config=require('./config');
const mainConfig=config.get("main");
const fs=require('fs');
const fsPromises = fs.promises;
const mime= require('mime-types');
const ipfs=require('ipfs-simple');
const crypto=require('crypto');
const screen=require('./screen');
const got=require('got');
const unzipper=require("unzipper");
const path = require('path');
const assets=require('./assets');

const DigiByte=require('digibyte-rpc');
const AWS=require('aws-sdk');


/**
 * Recursively deletes all contents of a folder
 * @param {string}  directory
 * @return {Promise<void>}
 */
const deleteFolder=async(directory)=>{
    return new Promise((resolve,reject)=> {
        fs.readdir(directory, async(err, files) => {
            if (err) return reject(err);
            for (const file of files) {
                let subPath=path.join(directory, file);
                if (fs.lstatSync(subPath).isDirectory()) {
                    await deleteFolder(subPath);
                    await fs.promises.rmdir(subPath);
                } else {
                    await fs.promises.unlink(subPath);
                }
            }
            resolve();
        });
    });
}

/**
 * Gets a wallet object if the wallet is on and properly configured
 * @return {Promise<DigiByteRPC>}
 *
 * Expected Errors: "Wallet not set up","Wallet offline or config has changed"
 */
const getWallet=async()=>{
    if (mainConfig.wallet===undefined) throw "Wallet not set up";
    let dgbWallet=new DigiByte(mainConfig.wallet.user,mainConfig.wallet.pass,mainConfig.wallet.host,mainConfig.wallet.port);
    try {
        await dgbWallet.getBlockCount();
        screen.green("Wallet","Running");
    } catch (e) {
        screen.red("Wallet","Offline or misconfigured");
        throw "Wallet offline or config has changed";
    }
    return dgbWallet;
}
// noinspection JSIgnoredPromiseFromCall
getWallet();


/*
███████╗████████╗██████╗ ███████╗ █████╗ ███╗   ███╗
██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔══██╗████╗ ████║
███████╗   ██║   ██████╔╝█████╗  ███████║██╔████╔██║
╚════██║   ██║   ██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║
███████║   ██║   ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║
╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
 */

let s3;
if (mainConfig.stream!==undefined) s3 = new AWS.S3(mainConfig.stream);

/**
 * Converts a stream to a string
 * @param {ReadStream|stream.Readable}  stream
 * @return {Promise<string>}
 */
const streamToString=async (stream)=>{
    return new Promise((resolve,reject) => {
        const chunks = [];
        stream.on('error', (error)=>reject(error));
        stream.on("data", chunk => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString()));
    });
}

/**
 * Gets a stream from digiassetX
 * @param {string}  Key
 * @return {Promise<ReadStream|stream.Readable>}
 */
const getStream=async(Key)=>(await s3.getObject({Bucket: "chaindata-digibyte",Key,RequestPayer:"requester"})).createReadStream();


/*
███████╗███████╗███████╗███████╗██╗ ██████╗ ███╗   ██╗███████╗
██╔════╝██╔════╝██╔════╝██╔════╝██║██╔═══██╗████╗  ██║██╔════╝
███████╗█████╗  ███████╗███████╗██║██║   ██║██╔██╗ ██║███████╗
╚════██║██╔══╝  ╚════██║╚════██║██║██║   ██║██║╚██╗██║╚════██║
███████║███████╗███████║███████║██║╚██████╔╝██║ ╚████║███████║
╚══════╝╚══════╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
 */
//set up sessions
const expressSession = require('express-session');
const MemoryStore = require('memorystore')(expressSession);
const session=expressSession({
    cookie: { maxAge: mainConfig.sessionLife },
    store: new MemoryStore({
        checkPeriod: mainConfig.sessionLife/4
    }),
    resave: false,
    saveUninitialized: true,
    secret: 'sfdsg . !!80s'
});



/*
 *  █████╗ ██████╗ ██╗
 * ██╔══██╗██╔══██╗██║
 * ███████║██████╔╝██║
 * ██╔══██║██╔═══╝ ██║
 * ██║  ██║██║     ██║
 * ╚═╝  ╚═╝╚═╝     ╚═╝
 */
const express = require('express');
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


/*_              _
 | |   ___  __ _(_)_ _
 | |__/ _ \/ _` | | ' \
 |____\___/\__, |_|_||_|
           |___/
 */
const hashPass=(salt,user,pass)=>crypto.createHash('sha256').update(salt + "|" + user + "|" + pass).digest('hex');
const isLoggedIn=(req)=>((mainConfig.users===false)||(req.session.login===true));

app.post('/api/user/login.json',session,async(req,res)=>{
    try {
        if (mainConfig.users !== false) {
            const {user, pass} = req.body;
            if (mainConfig.users===undefined) throw "Invalid User Name";
            let code = hashPass(mainConfig.users[user].salt,user,pass);
            if (code !== mainConfig.users[user].hash) throw "Invalid Hash";
            screen.log("Login Successful: "+user);
        }

        // noinspection JSUnresolvedVariable
        req.session.login=true;
        res.status(200).json(true);
    } catch (_) {
        res.status(200).json({error: "Invalid username or password"});
    }
});

app.get('/api/user/logout.json',session,async(req,res)=>{
    screen.log("Logged out");
    req.session.login=false;
    res.status(200).json(true);
});

app.get('/api/user/state.json',session,async(req,res)=>{
    let state=isLoggedIn(req)
    res.status(200).json(state);
});

app.all('/api/*',session,async(req,res,next)=>{
    // noinspection JSUnresolvedVariable
    if (isLoggedIn(req)) return next();
    res.status(401).json({error: "Not logged in"});
});



/* ___           __ _        _   _
  / __|___ _ _  / _(_)__ _  | | | |___ ___ _ _
 | (__/ _ \ ' \|  _| / _` | | |_| (_-</ -_) '_|
  \___\___/_||_|_| |_\__, |  \___//__/\___|_|
                     |___/
 */
app.post('/api/config/user/add.json',async(req,res)=>{
    try {
        //verify inputs
        const {user, pass} = req.body;
        if (user===undefined) throw "User parameter not set";
        if (user==="") throw "Username can't be blank";
        if (pass===undefined) throw "Pass parameter not set";
        if (mainConfig.users===false) mainConfig.users={};
        if (mainConfig.users[user]!==undefined) throw "Username already set";

        //create entry
        let salt='';
        for (let i=0;i<20;i++) salt+=Math.floor(Math.random()*16).toString(16);
        mainConfig.users[user]={salt,hash:hashPass(salt,user,pass)};

        //save and return
        screen.log("Add User: "+user);
        screen.green("Security","Secured");
        config.set("main",mainConfig);
        res.status(200).json(true);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});
if (mainConfig.users===false) {
    screen.red("Security","No Password Set");
} else {
    screen.green("Security","Secured");
}
app.get('/api/config/user/list.json',(req, res) => {
    if (mainConfig.users===false) {
        res.status(200).json([]);
    } else {
        res.status(200).json(Object.keys(mainConfig.users));
    }
});
app.post('/api/config/user/remove.json',(req, res) => {
    try {
        const {user} = req.body;
        if (user===undefined) throw "User parameter not set";
        if ((mainConfig.users === false) || (mainConfig.users[user] === undefined)) throw "User does not exist";
        if (Object.keys(mainConfig.users).length === 1)  throw "Can't remove only user";

        delete mainConfig.users[user];
        config.set("main", mainConfig);
        res.status(200).json(true);

    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

/* ___           __ _       __      __    _ _     _
  / __|___ _ _  / _(_)__ _  \ \    / /_ _| | |___| |_
 | (__/ _ \ ' \|  _| / _` |  \ \/\/ / _` | | / -_)  _|
  \___\___/_||_|_| |_\__, |   \_/\_/\__,_|_|_\___|\__|
                     |___/
 */
const testWalletConfig=async(user,pass,host,port)=>{
    let dgbWallet=new DigiByte(user,pass,host,port);
    try {
        await dgbWallet.getBlockCount();
    } catch (e) {
        return false;
    }
    mainConfig.wallet={user,pass,host,port};
    config.set("main",mainConfig);
    return true;
}
app.post('/api/config/wallet/set.json',async(req,res)=>{
    try {
        const {user,pass,host="127.0.0.1",port=14022} = req.body;
        if (user===undefined) throw "User parameter not set";
        if (pass===undefined) throw "Pass parameter not set";
        let data=await testWalletConfig(user,pass,host,port);
        if (!data) throw "Invalid Credentials";
        res.status(200).json(true);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

/**
 * returns true if file is valid config file and config works
 * returns false if config file is configured or missing but does not work
 * returns a string to the file if it exists but doesn't have correct settings
 * @param {string}  path
 * @return {Promise<string|boolean>}
 */
const processWalletDir=async(path)=>{
    const confPath=path+'/digibyte.conf';
    if (!fs.existsSync(confPath)) return false;

    let configValues={};

    //get config file
    let configData=fs.readFileSync(confPath,{encoding:"utf-8"}).split("\n");
    for (let line of configData) {
        //remove comments
        let index=line.indexOf("#");
        if (index>-1) {
            line=line.substr(0,index);
        }

        //get name and value
        let [name,value]=line.split("=");
        name=name.trim();
        value=value.trim();

        //see if something we need
        configValues[name]=value;
    }

    //see if port,user,and password are set
    if (
        (configValues["rpcuser"]!==undefined)&&
        (configValues["rpcpassword"]!==undefined)
    ) {
        return await testWalletConfig(configValues["rpcuser"],configValues["rpcpassword"],"127.0.0.1",configValues["rpcport"]||14022);
    }

    return confPath;
}
app.get('/api/config/wallet/autoSet.json',async(req,res)=>{
    try {
        let results=false;

        //check iOS and linux
        if (fs.existsSync('/home')) {
            let files=fs.readdirSync('/home');
            for (let file of files) {
                let possibleHome='/home/'+file+'/.digibyte';
                if (fs.lstatSync(possibleHome).isDirectory()) {
                    let possible=await processWalletDir(possibleHome);
                    if (possible===true) return res.status(200).json(true);  //if correct return true
                    if (results===false) results=possible;                              //if better then a current output then keep
                }
            }
        }

        //check windows
        let possibleHome=process.env.APPDATA+'\\Digibyte';
        if (fs.existsSync(possibleHome)) {
            let possible=await processWalletDir(possibleHome);
            if (possible===true) return res.status(200).json(true);  //if correct return true
            if (results===false) results=possible;                              //if better then a current output then keep
        }

        //return best result
        res.status(200).json(results);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

/* ___           __ _        ___ _
  / __|___ _ _  / _(_)__ _  / __| |_ _ _ ___ __ _ _ __
 | (__/ _ \ ' \|  _| / _` | \__ \  _| '_/ -_) _` | '  \
  \___\___/_||_|_| |_\__, | |___/\__|_| \___\__,_|_|_|_|
                     |___/
*/
app.post('/api/config/stream.json',async(req,res)=>{
    try {
        const {accessKeyId,secretAccessKey} = req.body;
        if (accessKeyId===undefined) throw "accessKeyId parameter not set";
        if (secretAccessKey===undefined) throw "secretAccessKey parameter not set";
        s3 = new AWS.S3({accessKeyId,secretAccessKey});
        try {
            //try to load current block height as test
            let stream = await getStream("height");
            await streamToString(stream);
        } catch (e) {
            throw "Invalid Credentials";
        }
        mainConfig.stream={accessKeyId,secretAccessKey};
        config.set("main",mainConfig);
        res.status(200).json(true);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});


/* ___           __ _        __  __        _ _
  / __|___ _ _  / _(_)__ _  |  \/  |___ __| (_)__ _
 | (__/ _ \ ' \|  _| / _` | | |\/| / -_) _` | / _` |
  \___\___/_||_|_| |_\__, | |_|  |_\___\__,_|_\__,_|
                     |___/
 */
app.get('/api/config/media.json',(req, res) => {
    res.status(200).json(mainConfig.includeMedia);
});
app.post('/api/config/media.json',(req, res) => {
    try {
        const {media} = req.body;

        //sanitize
        if (media===undefined) throw "All parameter not set";
        if (typeof media!=="boolean") {
            if (media.maxSize === undefined) throw "media.maxSize parameter not set";
            if (media.names === undefined) throw "media.names parameter not set";
            if (media.mimeTypes===undefined) throw "media.mimeTypes parameter not set";
            if (media.maxSize!==true) {
                if (parseInt(media.maxSize)!==media.maxSize) throw "media.maxSize must be an integer or true";
                if (media.maxSize<=0) throw "media.maxSize must be greater then zero";
            }
            if (media.names!==true) {
                if (!Array.isArray(media.names)&&(media.names.length>0)) throw "media.names must be an array of names";

            }
            if (media.mimeTypes!==true) {
                if (!Array.isArray(media.mimeTypes)&&(media.mimeTypes.length>0)) throw "media.mimeTypes must be an array of mime types";
            }
        }

        //save
        mainConfig.includeMedia=media;
        config.set("main",mainConfig);

    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

/* ___           __ _        ___      _    _ _    _    _
  / __|___ _ _  / _(_)__ _  | _ \_  _| |__| (_)__| |_ (_)_ _  __ _
 | (__/ _ \ ' \|  _| / _` | |  _/ || | '_ \ | (_-< ' \| | ' \/ _` |
  \___\___/_||_|_| |_\__, | |_|  \_,_|_.__/_|_/__/_||_|_|_||_\__, |
                     |___/                                   |___/
 */
app.post('/api/config/publishing.json',(req, res) => {
    try {
        const {port} = req.body;
        if (port===undefined) throw "port parameter not set";
        if (port!==false) {
            if (parseInt(port) !== port) throw "port must be an integer";
            if (port <= 1024) throw "port must be greater then 1024";
            //above line can be removed if you run the following 2 commands on linux machine.
            //sudo apt-get install libcap2-bin
            //sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``
            if (port > 65535) throw "port must be less the 65536";
        }
        mainConfig.publish=port;
        config.set("main",mainConfig);
        res.status(200).json(true);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});
app.get('/api/config/publishing.json',(req, res) => {
    try {
        res.status(200).json(mainConfig.publish);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});


/*_   __          _
 \ \ / /__ _ _ __(_)___ _ _
  \ V / -_) '_(_-< / _ \ ' \
   \_/\___|_| /__/_\___/_||_|
 */
/**
 * Gets a list of versions
 * @return {Promise<{compatible:string[],newer:string[]?,current:string}>}
 */
const getVersions=async()=>{
    let data={
        compatible:[],
        current:    mainConfig.templateVersion||"NA"
    };
    let {body}=await got.get("https://versions.digiassetX.com/digiasset_ipfs_metadata_server/versions.json",{responseType:"json"});
    for (let version of body) {
        // noinspection JSUnusedLocalSymbols
        let [major,minor]=version.split(".");
        if (major>apiVersion) {
            if (data.newer===undefined) data.newer=[];
            data.newer.push(version);
        } else if (major>=apiMinVersion) {
            data.compatible.push(version);
        }
    }
    return data;
}

/**
 * Download template file
 * @param {string?} version - if excluded downloads the most recent
 * @return {Promise<void>}
 */
const downloadVersion=async(version)=>{
    if (version===undefined) {
        let {compatible}=await getVersions();
        version=compatible.pop();   //use most recent
    }

    //download file
    try {
        await new Promise((resolve, reject) => {
            const url = "https://versions.digiassetX.com/digiasset_ipfs_metadata_server/" + version + ".zip";
            const downloadStream = got.stream(url);
            const fileWriterStream = fs.createWriteStream('template.zip');

            downloadStream
                .on("downloadProgress", ({transferred, total, percent}) => {
                    const percentage = Math.round(percent * 100);
                    screen.yellow("Template Folder", `Downloading: ${transferred}/${total} (${percentage}%)`);
                })
                .on("error", () => reject(`Download failed`));

            fileWriterStream
                .on("error", () => reject(`Could not save download`))
                .on("finish", ()=>resolve());

            downloadStream.pipe(fileWriterStream);
        });
    } catch (e) {
        screen.red("Template Folder",e);
        return;
    }

    //clear folder
    screen.yellow("Template Folder","Removing old template");
    if (fs.existsSync("template")) {
        await deleteFolder('template');
    } else {
        fs.mkdirSync('template');
    }

    //unzip contents
    screen.yellow("Template Folder","Unzipping");
    await fs.createReadStream('template.zip')
        .pipe(unzipper.Extract({ path: 'template' }))
        .on('entry', entry => entry.autodrain())
        .promise();

    //delete zipfile
    await fs.promises.unlink('template.zip');

    //update records
    mainConfig.templateVersion=version;
    config.set("main",mainConfig);
    screen.green("Template Folder","Updated to "+version);
}
app.get('/api/version/list.json',async(req,res)=>{
    try {
        let data=await getVersions();
        res.status(200).json(data);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});
app.get('/api/version/current.json',async(req,res)=>{
    try {
        res.status(200).json(mainConfig.templateVersion||"NA");
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});
app.post('/api/version/update.json',async(req,res)=>{
    try {
        if (req.body.version==="newest") req.body.version=undefined;
        await downloadVersion(req.body.version);
        res.status(200).json(true);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

//handle upgrade if template doesn't exist or is not compatible
if (!fs.existsSync('template')) {
    screen.red("Template Folder","Missing");
    // noinspection JSIgnoredPromiseFromCall
    downloadVersion();
} else if ((mainConfig.templateVersion===undefined)||(mainConfig.templateVersion.split(".")[0]<apiMinVersion)) {
    screen.red("Template Folder","Outdated");
    // noinspection JSIgnoredPromiseFromCall
    downloadVersion();
} else {
    screen.green("Template Folder","Version "+ mainConfig.templateVersion);
}

/*_    _    _
 | |  (_)__| |_
 | |__| (_-<  _|
 |____|_/__/\__|
 */
app.get('/api/list/all.json',async(req,res)=>{
    try {
        res.status(200).json(assets.list.all());
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});
app.get('/api/list/approved.json',async(req,res)=>{
    try {
        res.status(200).json(assets.list.approved());
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});
app.get('/api/list/unsorted.json',async(req,res)=>{
    try {
        res.status(200).json(assets.list.unsorted());
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});
app.get('/api/list/rejected.json',async(req,res)=>{
    try {
        res.status(200).json(assets.list.rejected());
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});
app.get('/api/list/subscriptions.json',async(req,res)=>{
    try {
        res.status(200).json(assets.list.subscriptions());
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

/* ___ ___ ___
  / __|_ _|   \
 | (__ | || |) |
  \___|___|___/
 */
app.post('/api/cid/approve.json',async(req,res)=>{
    try {
        const {cid,assetId}=req.body;
        if (assetId===undefined) throw "assetId parameter not set";
        if (cid===undefined) throw "cid parameter not set";
        assets.approveCid(assetId,cid);
        res.status(200).json(true);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

app.post('/api/cid/reject.json',async(req,res)=>{
    try {
        const {cid,assetId}=req.body;
        if (assetId===undefined) throw "assetId parameter not set";
        if (cid===undefined) throw "cid parameter not set";
        assets.rejectCid(assetId,cid);
        res.status(200).json(true);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

app.get('/api/cid/:cid.html',async(req,res)=>{
    // noinspection JSUnresolvedVariable
    let cid=req.params.cid;
    if (cid===undefined) {
        res.status(404).json({error:"Invalid Page"});
        return;
    }
    screen.log("Generating page for: "+cid);

    //get the requested data
    let cidData;
    try {
        cidData=await ipfs.cat(cid);
    } catch (e) {
        mainConfig.ignoreList.push(cid);
        config.set("main",mainConfig);
        res.status(404).json({error:"Could not get requested data"});
        return;
    }

    try {
        //see if it is json
        let str=JSON.stringify(JSON.parse(cidData), null, 4);

        //split to line by line
        let lines=str.split("\n");

        //look for encoded images
        let html='<html lang="en"><head><link href="/css/main.css" rel="stylesheet"><title>'+cid+'</title></head><body><div class="json">';
        let lastURL="";
        for (let line of lines) {
            let index=line.indexOf(': "data:image/');
            if (index===-1) {
                //write line
                html += line + "\n";

                //see if url was posted
                let offset=line.indexOf('"url": "');
                if (offset>=0) {
                    lastURL=line.substr(offset+8);
                    offset=lastURL.indexOf('"');
                    lastURL=lastURL.substr(0,offset);
                }

                //draw image or video
                offset=line.indexOf('"mimeType"');
                if (offset!==-1) {
                    //get mime type
                    let mimeType=line.substr(offset+13);
                    offset=mimeType.indexOf('"');
                    mimeType=mimeType.substr(0,offset);
                    switch (mimeType) {
                        case "image/jpg":
                        case "image/jpeg":
                        case "image/png":
                        case "image/gif":
                            html+=`</div><img src="${lastURL}" width="100%" alt="${lastURL}"><div class="json">`;
                            break;

                        case "image/svg+xml":
                            // noinspection HtmlUnknownAttribute
                            html+=`</div><svg width="400" height="400"><image xlink:href="${lastURL}" width="400" height="400"></image></svg><div class="json">`;
                            break;

                        case "video/mp4":
                            html+=`</div><video width="100%" controls><source src="${lastURL}"></video><div class="json">`
                            break;
                    }
                }

            } else {

                //data url
                html += line.substr(0,index+2)+'</div>';//add the header and finish div
                let length=line.length-index-4-(line.endsWith(","));//get length to keep(all that remains unless ends with a , then 1 less character
                html += '<img src="'+line.substr(index+3,length)+'" alt="Inline Data URL"><div class="json">';

            }
        }
        html+='</div></body></html>';
        res.status(200).end(html);
        return;
    } catch (_) {
    }

    //see if it is text
    if (/^[\x00-\x7F]*$/.test(cidData)) {
        let html=cidData
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/\n/g,'<br>');
        html='<html lang="en"><head><link href="/css/main.css" rel="stylesheet"><title>'+cid+'</title></head><body>'+html+'</body></html>';
        res.status(200).end(html);
        return;
    }

    //if still here and starting with Qm its an error
    if (cid.substr(0,2)==="Qm") {
        mainConfig.ignoreList.push(cid);
        config.set("main",mainConfig);
        res.status(404).json({error:"Invalid CID adding to ignore list"});
        return;
    }

    //handle if file
    // noinspection HttpUrlsUsage
    res.redirect(307,`http://${cid}${mainConfig.ipfsViewer}`);
});

/*                _   ___    _
  __ _ ______ ___| |_|_ _|__| |
 / _` (_-<_-</ -_)  _|| |/ _` |
 \__,_/__/__/\___|\__|___\__,_|
 */

app.post('/api/assetId/approve.json',async(req,res)=>{
    try {
        const {cid,assetId}=req.body;
        if (assetId===undefined) throw "assetId parameter not set";
        if (cid===undefined) throw "cid parameter not set";
        assets.approveAssetId(assetId,cid);
        res.status(200).json(true);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

app.post('/api/assetId/reject.json',async(req,res)=>{
    try {
        const {cid,assetId}=req.body;
        if (assetId===undefined) throw "assetId parameter not set";
        if (cid===undefined) throw "cid parameter not set";
        assets.rejectAssetId(assetId,cid);
        res.status(200).json(true);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

/*___ _        _
 / __| |_ __ _| |_ _  _ ___
 \__ \  _/ _` |  _| || (_-<
 |___/\__\__,_|\__|\_,_/__/
 */
app.get('/api/last_block.json',async(req,res)=>{
    res.status(200).json(config.get("lastHeight")||"Loading");
});

/*___ _
 / __| |_ _ _ ___ __ _ _ __
 \__ \  _| '_/ -_) _` | '  \
 |___/\__|_| \___\__,_|_|_|_|
 */
app.get('/api/stream/:key.json',async(req,res)=>{
    try {
        if (mainConfig.stream===undefined) throw "Stream not configured";
        const key=req.params.key;
        if (key===undefined) throw "Invalid key";
        (await getStream(key)).pipe(res);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

/*_      __    _ _     _
 \ \    / /_ _| | |___| |_
  \ \/\/ / _` | | / -_)  _|
   \_/\_/\__,_|_|_\___|\__|
All Functions Expected Errors: "Wallet not set up","Wallet offline or config has changed"
*/
app.get('/api/wallet/height.json',async(req,res)=>{
    try {
        let wallet=await getWallet();
        res.status(200).json(await wallet.getBlockCount());
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

app.post('/api/wallet/addresses/list.json',async(req,res)=>{
    let addresses=[];
    try {
        const {label}=req.body;
        let wallet=await getWallet();

        //get labels to look up
        let labels=[label];
        if (label===undefined) labels=await wallet.listLabels();

        //get list of addresses
        for (let label of labels) {
            let data=wallet.getAddressesByLabel();
            for (let address in data) {
                if (data[address]["purpose"]==="receive") addresses.push({label,address});
            }
        }
    } catch (e) {
        res.status(200).json({error:e.toString()});
        return;
    }

    //if stream enabled get extra data
    if (mainConfig.stream!==undefined) {
        for (let line of addresses) {
            try {
                let {kyc,issuance,deposit,withdraw}=await streamToString(await getStream(line.address));
                if (kyc!==undefined) line.kyc=kyc;
                if (issuance!==undefined) line.issuance=issuance;

                //get balance
                line.balance=BigInt(deposit.sum);
                if (withdraw!==undefined) line.balance-=BigInt(withdraw.sum);
                line.balance=line.balance.toString();
            } catch (_) {}
        }
    }

    res.status(200).json(addresses);
});

app.post('/api/wallet/addresses/new.json',async(req,res)=>{
    try {
        const {label}=req.body;
        let wallet=await getWallet();

        res.status(200).json(await wallet.getNewAddress(label,"bech32"));
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

app.post('/api/wallet/kyc.json',async(req,res)=>{
    try {
        const {addresses,password,options}=req.body;
        /*
            type:   s - secret
                    d - donate
                    p - public
         */
        let wallet=await getWallet();
        if (!Array.isArray(addresses)) throw "addresses must be an array of string";

        let pageVars={s: 3,a: {},t:"p"};
        if (options!==undefined) {
            const {type,pin,label,goal=0}=options;
            switch (type) {
                case "public":
                    break;

                case "donate":
                    if (label===undefined) throw "donate type requires a label";
                    if (label.length<2) throw "donate label must be at least 2 characters";
                    pageVars.l=label;
                    pageVars.g=goal;
                    pageVars.t="d";
                    break;

                case "secret":
                    if (pin===undefined) throw "secret type requires a pin";
                    if (pin.length<4) throw "secret pin must be at least 4 characters";
                    pageVars.p=pin;
                    pageVars.t="s";
                    break;

                default:
                    throw "Unknown option type";
            }
        }

        //get signatures
        let date=new Date().toISOString().split('T')[0];
        if (password!==undefined) await wallet.walletPassPhrase(password,60);
        for (let address of addresses) {
            if (typeof address!=="string") throw "addresses must be an array of string";
            //get private key for address(needed because wallet won't directly sign all address types)
            let pkey=await wallet.dumpPrivKey(address);
            let message=`I hereby certify that ${address} belongs to me and I grant digiassetX permission to certify this address.  Signed on ${date}`;
            let signature=await wallet.signMessageWithPrivKey(pkey,message);
            pageVars.a[address]=[signature,date];
        }

        //compute desired url and return
        res.status(200).json('https://digiassetx.com/kyc-address/?data='+btoa(JSON.stringify(pageVars)));
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

app.post('/api/wallet/utxos.json',async(req,res)=>{
    try {
        const {addresses}=req.body;
        let wallet=await getWallet();
        let utxos=await wallet.listUnspent(0,99999999,addresses);
        for (let utxo of utxos) {
            utxo.value=BigInt(utxo.amount*100000000).toString();
        }
        res.status(200).json(utxos);
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});

app.post('/api/wallet/send.json',async(req,res)=>{
    try {
        const {from,to,password}=req.body;
        let wallet=await getWallet();
        let hex=await wallet.createRawTransaction(from,to);
        if (password!==undefined) await wallet.walletPassPhrase(password,60);
        hex=await wallet.signRawTransactionWithWallet(hex);
        res.status(200).json(await wallet.sendRawTransaction(hex));
    } catch (e) {
        res.status(200).json({error:e.toString()});
    }
});



/*_      __   _      ___
 \ \    / /__| |__  | _ \__ _ __ _ ___
  \ \/\/ / -_) '_ \ |  _/ _` / _` / -_)
   \_/\_/\___|_.__/ |_| \__,_\__, \___|
                             |___/
 */
app.get('*',async(req,res)=>{
    try {
        //get file content
        let path = "template" + req.path;
        if (path.endsWith('/')) path += 'index.html';
        let fileData = await fsPromises.readFile(path);

        //get proper header data
        let mimeType = mime.contentType(path.split('/').pop());
        res.contentType(mimeType);

        //return data
        res.status(200).end(fileData);
    } catch (_) {
        res.status(404);
    }
});


//startup http server
app
    .listen(mainConfig.port, () => screen.green("User Interface", `Running at http://127.0.0.1:${mainConfig.port}`))
    .on('error', ()=>screen.red("User Interface","Failed to load"));