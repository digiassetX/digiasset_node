// noinspection JSUnfilteredForInLoop

const apiVersion=3;    //if changing interface in this file update /template/js/api.js to match
const apiMinVersion=3;
const DUST=1000n;
const MAX_COUNT_FIT=10;
const PERMANENT_ADDRESS={
    "NA":     "dgb1qjnzadu643tsfzjqjydnh06s9lgzp3m4sg3j68x",
    "CAN.AB": "dgb1qva97ew3zdwyadm5aqstqxe6xzzgxmxm7d6m3uw",
    "CAN.BC": "dgb1qhucf64cleqdme9637vukgxau8aflpk00thlq98",
    "CAN.MB": "dgb1qm4putt429lu9mlc6ypukky0fq3q9spm7pjwcy8",
    "CAN.NB": "dgb1qj4glly6ka7py8pkdme9t0vh77s0gym0vq2esee",
    "CAN.NL": "dgb1qnseslpvugsxcnvmz7m4emvmlgeryg80ujduspw",
    "CAN.NT": "dgb1q8c6p9nht8055lr5fczcvc4v29hunluqv3n3gaf",
    "CAN.NS": "dgb1qxhx0ahcmuxxmlwvnkjdq6dhmnem570g587m7hk",
    "CAN.NU": "dgb1qfc9029kc8ptvqt2nuqe4sxtps2nd83kq7pugtm",
    "CAN.ON": "dgb1q84h0g4lpy0prppc2507wf7ngne26thza0sntgr",
    "CAN.PE": "dgb1qkqggn9y85tlyxdfhg9ls3ygph4nd58j0acnlz6",
    "CAN.QC": "dgb1qnynkfl44ztsw3et6rq9yhxmefrcm8ufd3afm3e",
    "CAN.SK": "dgb1qylaqaen0jqs2sk7jlc74yarw5lg4nzwtac9vyp",
    "CAN.YT": "dgb1qatvzudt2jey06kx8zn3a6p0nw689s9dxkjp57g"
}
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
const multer = require('multer');
const DigiByte=require('digibyte-rpc');
const outputPair=require('outputpair');
const txSize=require('tx-size');
const showdown=require('showdown');

const wallet=require('./wallet');
const stream=require('./stream');
const {DigiAssetTransferor,DigiAssetIssuer}=stream.assetEncoder;
const bitcoin=require('bitcoinjs-lib');
const ExpectedError=require('./ExpectedError');

/**
 * Runs an asynchronous function until it runs without an error
 *
 * example usage
 *
 * before:
 *  await function(variable);
 *
 * after:
 *  await doUntilSuccess(()=>function(variable));
 *
 * @param func
 * @return {Promise<unknown>}
 */
const doUntilSuccess=async(func)=>{
    let success=false;
    let response;
    while (!success) {
        try {
            response=await func();
            success=true;
        } catch (e) {
        }
    }
    return response;
}

/**
 * Recursively deletes all contents of a folder
 * @param {string}  directory
 * @return {Promise<void>}
 */
const deleteFolder=async(directory)=>{
    return new Promise((resolve,reject)=> {
        try {
            fs.readdir(directory, async (err, files) => {
                if (err) return reject(err);
                for (const file of files) {
                    let subPath = path.join(directory, file);
                    if (fs.lstatSync(subPath).isDirectory()) {
                        await deleteFolder(subPath);
                        await doUntilSuccess(() => fs.promises.rmdir(subPath));
                    } else {
                        await doUntilSuccess(() => fs.promises.unlink(subPath));
                    }
                }
                resolve();
            });
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Helper to return error codes as human readable
 * @param e
 * @return {{error: string}}
 */
const processError=(e)=>(e.message!==undefined)?{error:e.message}:{error:e.toString()};

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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/*___ _        _
 / __| |_ __ _| |_ _  _ ___
 \__ \  _/ _` |  _| || (_-<
 |___/\__\__,_|\__|\_,_/__/
 */
app.get('/api/status/console.json',(req,res)=>{
    let response;
    try {
        response=screen.getStatus();
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});
app.get('/api/status/ip.json',async(req,res)=>{
    let response;
    try {
        response=await config.ip();
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});


/*_              _
 | |   ___  __ _(_)_ _
 | |__/ _ \/ _` | | ' \
 |____\___/\__, |_|_||_|
           |___/
 */
const hashPass=(salt,user,pass)=>crypto.createHash('sha256').update(salt + "|" + user + "|" + pass).digest('hex');
const isLoggedIn=(req)=>((mainConfig.users===false)||(req.session.login===true));

app.post('/api/user/login.json',session,async(req,res)=>{
    let response=true;
    try {
        if (mainConfig.users !== false) {
            const {user, pass} = req.body;
            if (mainConfig.users===undefined) throw new ExpectedError("Invalid User Name");
            let code = hashPass(mainConfig.users[user].salt,user,pass);
            if (code !== mainConfig.users[user].hash) throw new ExpectedError("Invalid Hash");
            screen.log("Login Successful: "+user);
        }

        // noinspection JSUnresolvedVariable
        req.session.login=true;
    } catch (_) {
        response={error: "Invalid username or password"};
    }
    res.status(200).json(response);
});

app.get('/api/user/logout.json',session,async(req,res)=>{
    let response=true;
    try {
        screen.log("Logged out");
        req.session.login=false;
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.get('/api/user/state.json',session,async(req,res)=>{
    let response;
    try {
        response=isLoggedIn(req);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.all('/api/*',session,async(req,res,next)=>{
    // noinspection JSUnresolvedVariable
    if (isLoggedIn(req)) return next();
    res.status(401).json({error: "Not logged in"});
});

/*_____ ___  ___
 |_   _/ _ \/ __|
   | || (_) \__ \
   |_| \___/|___/
 */

app.get('/api/tos.json',async(req,res)=>{
    let response;
    try {
        let tosText=fs.readFileSync('template/tos.md',{encoding:"utf-8"})
        let hash=crypto.createHash('sha256').update(tosText).digest('hex');
        let agreed=(mainConfig.tos===hash);
        let converter=new showdown.Converter();
        response={
            agreed, hash,
            tos:    converter.makeHtml(tosText)
        };
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.post('/api/tos.json',async(req,res)=>{
    let response=true;
    try {
        const {hash}=req.body;
        mainConfig.tos=hash;
        config.set("main",mainConfig);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/* ___ ___  ___  ___
  / __/ _ \| _ \/ __|
 | (_| (_) |   /\__ \
  \___\___/|_|_\|___/
 */
const corsStream=async(url,req,res)=>{
    //verify inputs
    if (req.query!==undefined) {
        let parts=[];
        for (let id in req.query) parts.push(id+'='+encodeURI(req.query[id]));
        if (parts.length>0) url+='?'+parts.join('&');
    }
    let stream=got.stream(url);
    stream.pipe(res);
    stream.on('error',(_)=>{
        screen.log(url +" failed to load");
    });
}
const ipfsStream=async(cid,req,res)=>{
    let data=await ipfs.catBuffer(cid);
    res.status(200).end(data);
}


app.post('/api/cors/',async(req,res)=> {
    try {
        //verify inputs
        let {url} = req.body;
        let [scheme,cid]=url.split("://");
        if (scheme==="ipfs") {
            // noinspection ES6MissingAwait
            ipfsStream(cid,req,res);
        } else {
            // noinspection ES6MissingAwait
            corsStream(url, req, res);
        }
    } catch (e) {
        res.status(200).json(processError(e));
    }
});
app.get('/api/cors/https/*',async(req,res)=> {
    try {
        let url = 'https://'+req.path.substr(16);
        // noinspection ES6MissingAwait
        corsStream(url,req,res);
    } catch (e) {
        res.status(200).json(processError(e));
    }
});
app.get('/api/cors/http/*',async(req,res)=> {
    try {
        // noinspection HttpUrlsUsage
        let url = req.path.substr(16);
        // noinspection ES6MissingAwait
        corsStream(url,req,res);
    } catch (e) {
        res.status(200).json(processError(e));
    }
});
app.get('/api/cors/ipfs/*',async(req,res)=> {
    try {
        //verify inputs
        const cid = req.path.substr(15);
        // noinspection ES6MissingAwait
        ipfsStream(cid,req,res);
    } catch (e) {
        res.status(200).json(processError(e));
    }
});
app.get('/api/cors/icon/:assetCid',async(req,res)=> {
    try {
        //get cid we will use
        const {assetCid}=req.params;

        //get icon url
        let {data}=await ipfs.catJSON(assetCid);
        let iconUrl;
        for (let {name,url} of data.urls) {
            if (name==="icon") iconUrl=url;
        }
        if (iconUrl===undefined) {
            //if no media
            // noinspection ES6MissingAwait
            corsStream("/images/broken.jpg", req, res);
            return;
        }

        //return the icon
        let [scheme,cid]=iconUrl.split("://");
        if (scheme==="ipfs") {
            // noinspection ES6MissingAwait
            ipfsStream(cid,req,res);
        } else {
            // noinspection ES6MissingAwait
            corsStream(iconUrl, req, res);
        }
    } catch (e) {
        res.status(200).json(processError(e));
    }
});


/* ___           __ _        _   _
  / __|___ _ _  / _(_)__ _  | | | |___ ___ _ _
 | (__/ _ \ ' \|  _| / _` | | |_| (_-</ -_) '_|
  \___\___/_||_|_| |_\__, |  \___//__/\___|_|
                     |___/
 */
app.post('/api/config/user/add.json',async(req,res)=>{
    let response=true;
    try {
        //verify inputs
        const {user, pass} = req.body;
        if (user===undefined) throw new ExpectedError("User parameter not set");
        if (user==="") throw new ExpectedError("Username can't be blank");
        if (pass===undefined) throw new ExpectedError("Pass parameter not set");
        if (mainConfig.users===false) mainConfig.users={};
        if (mainConfig.users[user]!==undefined) throw new ExpectedError("Username already set");

        //create entry
        let salt='';
        for (let i=0;i<20;i++) salt+=Math.floor(Math.random()*16).toString(16);
        mainConfig.users[user]={salt,hash:hashPass(salt,user,pass)};

        //save and return
        screen.log("Add User: "+user);
        screen.green("Security","Secured");
        config.set("main",mainConfig);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});
if (mainConfig.users===false) {
    screen.yellow("Security","No Password Set");
} else {
    screen.green("Security","Secured");
}
app.get('/api/config/user/list.json',(req, res) => {
    let response;
    try {
        response=(mainConfig.users===false)?[]:Object.keys(mainConfig.users);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});
app.post('/api/config/user/remove.json',(req, res) => {
    let response=true;
    try {
        const {user} = req.body;
        if (user===undefined) throw new ExpectedError("User parameter not set");
        if ((mainConfig.users === false) || (mainConfig.users[user] === undefined)) throw new ExpectedError("User does not exist");
        if (Object.keys(mainConfig.users).length === 1)  throw new ExpectedError("Can't remove only user");

        delete mainConfig.users[user];
        config.set("main", mainConfig);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/* ___           __ _       __      __    _ _     _
  / __|___ _ _  / _(_)__ _  \ \    / /_ _| | |___| |_
 | (__/ _ \ ' \|  _| / _` |  \ \/\/ / _` | | / -_)  _|
  \___\___/_||_|_| |_\__, |   \_/\_/\__,_|_|_\___|\__|
                     |___/
 */
const testWalletConfig=async(user,pass,host,port)=>{
    try {
        screen.log("Attempting to set wallet");
        let dgbWallet=new DigiByte(user,pass,host,port);
        await dgbWallet.getBlockCount();
        screen.log("Wallet set");
    } catch (e) {
        screen.log("Wallet failed to set");
        return false;
    }
    mainConfig.wallet={user,pass,host,port};
    config.set("main",mainConfig);
    return true;
}
app.post('/api/config/wallet/set.json',async(req,res)=>{
    let response=true;
    try {
        const {user,pass,host="127.0.0.1",port=14022} = req.body;
        if (user===undefined) throw new ExpectedError("User parameter not set");
        if (pass===undefined) throw new ExpectedError("Pass parameter not set");
        let data=await testWalletConfig(user,pass,host,port);
        if (!data) throw new ExpectedError("Invalid Credentials");
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
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
    let response=false;
    try {
        //check iOS and linux
        if (fs.existsSync('/home')) {
            let files=fs.readdirSync('/home');
            for (let file of files) {
                let possibleHome='/home/'+file+'/.digibyte';
                if (fs.lstatSync(possibleHome).isDirectory()) {
                    let possible=await processWalletDir(possibleHome);
                    if (possible===true) return res.status(200).json(true);  //if correct return true
                    if (response===false) response=possible;                              //if better then a current output then keep
                }
            }
        }

        //check windows
        let possibleHome=process.env.APPDATA+'\\Digibyte';
        if (fs.existsSync(possibleHome)) {
            let possible=await processWalletDir(possibleHome);
            if (possible===true) return res.status(200).json(true);  //if correct return true
            if (response===false) response=possible;                              //if better then a current output then keep
        }
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/* ___           __ _        ___ _
  / __|___ _ _  / _(_)__ _  / __| |_ _ _ ___ __ _ _ __
 | (__/ _ \ ' \|  _| / _` | \__ \  _| '_/ -_) _` | '  \
  \___\___/_||_|_| |_\__, | |___/\__|_| \___\__,_|_|_|_|
                     |___/
*/
app.post('/api/config/stream.json',async(req,res)=>{
    let response=true;
    try {
        await stream.config(req.body);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});


/* ___           __ _        __  __        _ _
  / __|___ _ _  / _(_)__ _  |  \/  |___ __| (_)__ _
 | (__/ _ \ ' \|  _| / _` | | |\/| / -_) _` | / _` |
  \___\___/_||_|_| |_\__, | |_|  |_\___\__,_|_\__,_|
                     |___/
 */
app.get('/api/config/media.json',(req, res) => {
    let response;
    try {
        response=mainConfig.includeMedia;
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});
app.post('/api/config/media.json',(req, res) => {
    let response=true;
    try {
        const {media} = req.body;

        //sanitize
        if (media===undefined) throw new ExpectedError("All parameter not set");
        if (typeof media!=="boolean") {
            if (media.maxSize === undefined) throw new ExpectedError("media.maxSize parameter not set");
            if (media.names === undefined) throw new ExpectedError("media.names parameter not set");
            if (media.mimeTypes===undefined) throw new ExpectedError("media.mimeTypes parameter not set");
            if (media.maxSize!==true) {
                if (parseInt(media.maxSize)!==media.maxSize) throw new ExpectedError("media.maxSize must be an integer or true");
                if (media.maxSize<=0) throw new ExpectedError("media.maxSize must be greater then zero");
            }
            if (media.names!==true) {
                if (!Array.isArray(media.names)&&(media.names.length>0)) throw new ExpectedError("media.names must be an array of names");

            }
            if (media.mimeTypes!==true) {
                if (!Array.isArray(media.mimeTypes)&&(media.mimeTypes.length>0)) throw new ExpectedError("media.mimeTypes must be an array of mime types");
            }
        }

        //save
        mainConfig.includeMedia=media;
        config.set("main",mainConfig);

    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/* ___           __ _        ___      _    _ _    _    _
  / __|___ _ _  / _(_)__ _  | _ \_  _| |__| (_)__| |_ (_)_ _  __ _
 | (__/ _ \ ' \|  _| / _` | |  _/ || | '_ \ | (_-< ' \| | ' \/ _` |
  \___\___/_||_|_| |_\__, | |_|  \_,_|_.__/_|_/__/_||_|_|_||_\__, |
                     |___/                                   |___/
 */
app.post('/api/config/publishing.json',(req, res) => {
    let response=true;
    try {
        const {port} = req.body;
        if (port===undefined) throw new ExpectedError("port parameter not set");
        if (port!==false) {
            if (parseInt(port) !== port) throw new ExpectedError("port must be an integer");
            if (port <= 1024) throw new ExpectedError("port must be greater then 1024");
            //above line can be removed if you run the following 2 commands on linux machine.
            //sudo apt-get install libcap2-bin
            //sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``
            if (port > 65535) throw new ExpectedError("port must be less the 65536");
        }
        mainConfig.publish=port;
        config.set("main",mainConfig);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});
app.get('/api/config/publishing.json',(req, res) => {
    let response;
    try {
        response=mainConfig.publish;
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/* ___           __ _        ___      _               _      _   _
  / __|___ _ _  / _(_)__ _  / __|_  _| |__ ___ __ _ _(_)_ __| |_(_)___ _ _
 | (__/ _ \ ' \|  _| / _` | \__ \ || | '_ (_-</ _| '_| | '_ \  _| / _ \ ' \
  \___\___/_||_|_| |_\__, | |___/\_,_|_.__/__/\__|_| |_| .__/\__|_\___/_||_|
                     |___/                             |_|
 */
app.post('/api/config/subscription/add.json',async (req,res)=>{
    let response=true;
    let {url,approved,rejected}=req.body;
    try {
        //download lists and make sure they exists
        await got.get(`${url}/approved.json`, {
            responseType: "json",
        });
        await got.get(`${url}/rejected.json`, {
            responseType: "json",
        });
    } catch (e) {
        return res.status(200).json({error:"Invalid Subscription"});
    }
    try {
        approved=((approved==="true")||(approved===true));
        rejected=((rejected==="true")||(rejected===true));
        let subscriptions=config.get("subscriptions");
        subscriptions[url]={approved,rejected};
        config.set("subscriptions",subscriptions);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/**
 *
 * @param {"approved"|"rejected"}   type
 * @param {Request} req
 * @param {Response}res
 */
const subscriptionUpdate=(type,req,res)=>{
    let response=true;
    try {
        let {url,enabled}=req.body;
        enabled=((enabled==="true")||(enabled===true));
        let subscriptions=config.get("subscriptions");
        if (subscriptions[url]===undefined) subscriptions[url]={approved:false,rejected:false};
        subscriptions[url][type]=enabled;
        config.set("subscriptions",subscriptions);
    } catch (e) {
        response=processError(e);
    }
    // noinspection JSValidateTypes
    res.status(200).json(response);
}

app.post('/api/config/subscription/approved.json',(req,res)=>{
    subscriptionUpdate("approved",req,res);
});
app.post('/api/config/subscription/rejected.json',(req,res)=>{
    subscriptionUpdate("rejected",req,res);
});


/* ___           __ _         ___       _     ___
  / __|___ _ _  / _(_)__ _   / _ \ _ __| |_  |_ _|_ _
 | (__/ _ \ ' \|  _| / _` | | (_) | '_ \  _|  | || ' \
  \___\___/_||_|_| |_\__, |  \___/| .__/\__| |___|_||_|
                     |___/        |_|
 */
app.get('/api/config/optIn.json',(req,res)=>{
    let response;
    try {
        let {showOnMap=false,publishPeerId=false,payout=""}=mainConfig.optIn||{};
        response={showOnMap,publishPeerId,payout};
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});
app.post('/api/config/optIn.json',(req,res)=> {
    let response=true;
    try {
        let {showOnMap = false, publishPeerId = false,payout=""} = req.body;
        mainConfig.optIn={showOnMap, publishPeerId,payout};
        config.set('main',mainConfig);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/*_   __          _
 \ \ / /__ _ _ __(_)___ _ _
  \ V / -_) '_(_-< / _ \ ' \
   \_/\___|_| /__/_\___/_||_|
 */
/**
 * Gets a list of versions
 * @return {Promise<{compatible:string[],newer:?string[],current:string}>}
 */
const getVersions=async()=>{
    let data={
        compatible: [],
        current:    mainConfig.templateVersion||"NA"
    };
    let {body}=await got.get("https://versions.digiassetX.com/digiasset_node/versions.json",{responseType:"json"});
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
    // noinspection JSValidateTypes
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
        if (version===undefined) throw new ExpectedError("No Template Available");    //no version available
        await new Promise((resolve, reject) => {
            const url = "https://versions.digiassetX.com/digiasset_node/" + version + ".zip";
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
    let response;
    try {
        response=await getVersions();
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});
app.get('/api/version/current.json',async(req,res)=>{
    let response;
    try {
        response=mainConfig.templateVersion||"NA";
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});
app.post('/api/version/update.json',async(req,res)=>{
    let response=true;
    try {
        if (req.body.version==="newest") req.body.version=undefined;
        await downloadVersion(req.body.version);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
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
    let response;
    try {
        response=assets.list.all();
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});
app.get('/api/list/approved.json',async(req,res)=>{
    let response;
    try {
        response=assets.list.approved();
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});
app.get('/api/list/unsorted.json',async(req,res)=>{
    let response;
    try {
        response=assets.list.unsorted();
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});
app.get('/api/list/rejected.json',async(req,res)=>{
    let response;
    try {
        response=assets.list.rejected();
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});
app.get('/api/list/subscriptions.json',async(req,res)=>{
    let response=[];
    try {
        let subscriptions=assets.list.subscriptions();
        for (let url in subscriptions) {
            let {approved,rejected}=subscriptions[url];
            response.push({url,approved,rejected});
        }
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/* ___ ___ ___
  / __|_ _|   \
 | (__ | || |) |
  \___|___|___/
 */
app.post('/api/cid/approve.json',async(req,res)=>{
    let response=true;
    try {
        const {cid,assetId}=req.body;
        if (assetId===undefined) throw new ExpectedError("assetId parameter not set");
        if (cid===undefined) throw new ExpectedError("cid parameter not set");
        assets.approveCid(assetId,cid);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.post('/api/cid/reject.json',async(req,res)=>{
    let response=true;
    try {
        const {cid,assetId}=req.body;
        if (assetId===undefined) throw new ExpectedError("assetId parameter not set");
        if (cid===undefined) throw new ExpectedError("cid parameter not set");
        assets.rejectCid(assetId,cid);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
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
        let html='<html lang="en"><head><link href="/css/main.css" rel="stylesheet"><title>'+cid+'</title></head><body><div id="pre"></div><h1>Meta Data:</h1><div class="json">';
        let lastImage={};
        for (let line of lines) {
            let index=line.indexOf(': "data:image/');
            if (index===-1) {
                let endSearch=line.trim();
                if ((endSearch==="}")||(endSearch==="},")) {
                    //draw image if one was found
                    if ((lastImage.mimeType!==undefined)&&(lastImage.url!==undefined)) {
                        switch (lastImage.mimeType) {
                            case "image/jpg":
                            case "image/jpeg":
                            case "image/png":
                            case "image/gif":
                                html += `</div><img src="${lastImage.url}" width="100%" alt="${lastImage.url}"><div class="json">`;
                                break;

                            case "image/svg+xml":
                                // noinspection HtmlUnknownAttribute
                                html += `</div><svg width="400" height="400"><image xlink:href="${lastImage.url}" width="400" height="400"></image></svg><div class="json">`;
                                break;

                            case "video/mp4":
                                html += `</div><video width="100%" controls><source src="${lastImage.url}"></video><div class="json">`
                                break;
                        }
                    }

                    lastImage={};
                }


                //write line
                html += line + "\n";

                //see if url was posted
                let offset=line.indexOf('"url": "');
                if (offset>=0) {
                    //get url
                    lastImage.url=line.substr(offset+8);
                    offset=lastImage.url.indexOf('"');
                    lastImage.url=lastImage.url.substr(0,offset);

                    //convert to cors
                    let parts=lastImage.url.split("://");
                    lastImage.url = `/api/cors/${parts[0]}/${parts[1]}`;
                }

                //draw image or video
                offset=line.indexOf('"mimeType"');
                if (offset!==-1) {
                    //get mime type
                    lastImage.mimeType=line.substr(offset+13);
                    offset=lastImage.mimeType.indexOf('"');
                    lastImage.mimeType=lastImage.mimeType.substr(0,offset);
                }

            } else {

                //data url
                html += line.substr(0,index+2)+'</div>';//add the header and finish div
                let length=line.length-index-4-(line.endsWith(","));//get length to keep(all that remains unless ends with a , then 1 less character
                html += '<img src="'+line.substr(index+3,length)+'" alt="Inline Data URL"><div class="json">';

            }
        }
        html+=`</div><div id="post"></div></body></html>`;
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

    //handle if file
    res.redirect(307,"/api/cors/ipfs/"+cid);
});

app.post('/api/cid/stream',async(req,res)=> {
    try {
        //verify inputs
        const {cid} = req.body;
        let cidData=await ipfs.catBuffer(cid);
        res.status(200).end(cidData);
    } catch (e) {
        res.status(404).json({error:"Could not get requested data"});
    }
});

app.post('/api/cid/write',multer().single('file'),async(req,res)=> {
    let response;
    try {
        // noinspection JSUnresolvedVariable
        let file=req.file;
        response=await ipfs.addBuffer(file.buffer);
        screen.log(response);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/*                _   ___    _
  __ _ ______ ___| |_|_ _|__| |
 / _` (_-<_-</ -_)  _|| |/ _` |
 \__,_/__/__/\___|\__|___\__,_|
 */

app.post('/api/assetId/approve.json',async(req,res)=>{
    let response=true;
    try {
        const {cid,assetId}=req.body;
        if (assetId===undefined) throw new ExpectedError("assetId parameter not set");
        if (cid===undefined) throw new ExpectedError("cid parameter not set");
        assets.approveAssetId(assetId,cid);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.post('/api/assetId/reject.json',async(req,res)=>{
    let response=true;
    try {
        const {cid,assetId}=req.body;
        if (assetId===undefined) throw new ExpectedError("assetId parameter not set");
        if (cid===undefined) throw new ExpectedError("cid parameter not set");
        assets.rejectAssetId(assetId,cid);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/*___ _        _
 / __| |_ __ _| |_ _  _ ___
 \__ \  _/ _` |  _| || (_-<
 |___/\__\__,_|\__|\_,_/__/
 */
app.get('/api/last_block.json',async(req,res)=>{
    let response;
    try {
        response=config.get("lastHeight")||"Loading";
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/*___ _
 / __| |_ _ _ ___ __ _ _ __
 \__ \  _| '_/ -_) _` | '  \
 |___/\__|_| \___\__,_|_|_|_|
 */
app.post('/api/stream/clear.json',async(req,res)=>{
    let response=true;
    try {
        let {height=0}=req.body;
        await stream.clearCache(height);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.post('/api/stream/get.json',async(req,res)=>{
    try {
        const {Key,useCache=true}=req.body;
        if (Key===undefined) throw new ExpectedError("Invalid key");
        // noinspection JSUnresolvedFunction
        (await stream.get(Key,useCache)).pipe(res);
    } catch (e) {
        res.status(200).json(processError(e));
    }
});

app.post('/api/stream/hash/lookup.json',async(req,res)=> {
    let response;
    try {
        //get the address that will publish the hash
        let {start=1,end,hash}=req.body;
        if (end===undefined) end=await stream.get("height");
        start=Math.ceil(start/1000000)*1000000;
        end=Math.ceil(end/1000000)*1000000;

        //search for data in chain
        for (let i=start;i<=end;i+=1000000) {
            let objectData=await stream.get("data_tx_"+i);
            if (objectData===false) continue;
            for (let {height,txid,data} of objectData) {
                if (data===hash) {
                    res.status(200).json({height,txid,hash});
                    return;
                }
            }
        }
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/*_      __    _ _     _
 \ \    / /_ _| | |___| |_
  \ \/\/ / _` | | / -_)  _|
   \_/\_/\__,_|_|_\___|\__|
All Functions Expected Errors: "Wallet not set up","Wallet offline or config has changed"
*/
app.get('/api/wallet/fix/labels.json',async(req,res)=>{
    let response;
    try {
        response=await wallet.findMissing();
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});
app.get('/api/wallet/height.json',async(req,res)=>{
    let response;
    try {
        response=await wallet.getBlockCount();
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.get('/api/wallet/asset/list.json',async(req,res)=>{
    let response=[];
    try {
        let {byLabel}=req.query;
        byLabel=((byLabel==="true")||(byLabel===true));
        const addToResponse=async(assets,label=undefined)=>{
            for (let {assetId,value,decimals,cid,data} of assets) {
                let metadata;
                if (typeof data.metadata==="object") {
                    let cidToUse = cid || data.metadata[data.metadata.length-1].cid;
                    try {
                        metadata = await ipfs.catJSON(cidToUse, 20000);
                    } catch (e) {
                    }
                }
                response.push({label,assetId,value,decimals,cid,data,metadata});
            }
        }
        if (!byLabel) {

            //ignore labels
            let addresses=await wallet.getAddresses();
            await addToResponse(await wallet.getAssets(addresses));

        } else {

            //split by labels
            let labels=await wallet.listLabels();
            for (let label of labels) {
                let addresses=await wallet.getAddresses(label);
                await addToResponse(await wallet.getAssets(addresses),label);
            }

        }
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.get('/api/wallet/asset/issuable.json',async(req,res)=>{
    let response=[];
    try {
        let {kyc=true,label}=req.query;
        // noinspection JSIncompatibleTypesComparison
        kyc=((kyc==="true")||(kyc===true));

        //get list of addresses
        let addresses=await wallet.getAddresses(label);

        //see if kyc verified
        for (let address of addresses) {
            let addressData;

            //if address data not already cached get it
            try {
                let {/** @type {KycState}*/kyc, issuance=[],deposit,withdraw={sum:"0"}} = await stream.json(address);
                addressData = {
                    kyc: ((kyc !== undefined) && (kyc.revoked === undefined)),
                    issuance,
                    value:  BigInt(deposit.sum)-BigInt(withdraw.sum)
                }
            } catch (_) {
                //address never used yet
                addressData = {
                    kyc: false,
                    issuance: [],
                    value:  0n
                }
            }

            //check if should be in this list
            if (addressData.kyc!==kyc) continue;

            //add to response
            response.push({
                address,
                issuance: addressData.issuance,
                value:    addressData.value.toString()
            });
        }

    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.get('/api/wallet/asset/:assetId.json',async(req,res)=>{
    let response;
    try {
        const assetId=req.params.assetId;

        //make sure in cache
        response=JSON.parse(JSON.stringify(await wallet.assetData(assetId)));//deep copy

        //get actual meta data
        response.metadata=response.metadata.pop();  //only use the last issuance
        try {
            response.metadata.data = await ipfs.catJSON(response.metadata.cid, 20000);
        } catch (e) {}

    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

//if get used then all addresses and labels are returned
app.all('/api/wallet/addresses/list.json',async(req,res)=>{
    let response=[];
    try {
        const {label}=req.body;
        response=await wallet.getAddresses(label,true);
    } catch (e) {
        res.status(200).json(processError(e));
        return;
    }

    //if stream enabled get extra data
    if (mainConfig.stream!==undefined) {
        for (let line of response) {
            try {
                let {kyc,issuance,deposit,withdraw}=await stream.json(line.address);
                if (kyc!==undefined) line.kyc=kyc;
                if (issuance!==undefined) line.issuance=issuance;

                //get balance
                line.balance=BigInt(deposit.sum);
                if (withdraw!==undefined) line.balance-=BigInt(withdraw.sum);
                line.balance=line.balance.toString();
            } catch (_) {
                line.balance="0";
            }
        }
    }

    res.status(200).json(response);
});

app.post('/api/wallet/addresses/new.json',async(req,res)=>{
    let response;
    try {
        const {label,type="bech32"}=req.body;
        response=await wallet.getNewAddress(label,type);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});


app.post('/api/wallet/build/assetTx.json',async(req,res)=>{
    let response=await(async(req)=> {
        try {
            const {recipients, label, assetId, vote=false} = req.body;
            screen.log("Build for: " + assetId);

            //get quantity needed
            let needed = 0n;
            for (let address in recipients) {
                recipients[address] = BigInt(recipients[address]);
                needed += recipients[address];
            }
            if (needed === 0n) return {costs: [], hex: ""};

            //generate utxos
            let utxos = await wallet.getAssetUTXOs(assetId, needed, label);
            const decimals = (assetId === "DigiByte") ? 8 : utxos[0].assets[0].decimals;

            //get change addresses
            let coinChange = await wallet.getChangeAddress();
            let change=[coinChange];
            let costs = [];
            let hex;

            //modify output to match
            if (assetId==="DigiByte") {

                //standard DigiByte transaction
                let outputs=[];
                let leftOver=0n-needed;
                for (let {value} of utxos) {
                    leftOver+=BigInt(value);
                }
                for (let address in recipients) outputs.push(outputPair(address,recipients[address]))

                //calculate mining fee needed
                let miningFee=BigInt(txSize(utxos.length,outputs.length+1));

                //add change to transaction
                leftOver-=miningFee;
                if (leftOver<0n) throw new ExpectedError("Not enough DigiByte found");
                if (leftOver<DUST) {
                    miningFee+=leftOver;
                } else {
                    outputs.push(outputPair(coinChange,leftOver));
                }

                //create unsigned transaction
                let inputs=[];
                for (let {txid,vout} of utxos) inputs.push({txid,vout});
                hex = await wallet.createRawTransaction(inputs, outputs);

                //compute mining cost
                costs.push({type: "Mining Fees", amount: wallet.satToDecimal(miningFee, 8) + " DGB"});

            } else {

                //asset transaction
                let transferor=new DigiAssetTransferor();
                transferor.forceLookup=true;
                transferor.DigiByteChangeAddress=coinChange;
                await transferor.addUTXOs(utxos);
                await transferor.addOutputs(assetId,recipients);
                if (!vote) {
                    let assetChange = await wallet.getChangeAddress();
                    change.push(assetChange);
                    transferor.setAssetChangeAddress(assetChange);
                    await wallet.setChangeAddress(assetChange);
                }
                await transferor.build();
                let {inputs,outputs}=transferor.tx;
                let royalties=transferor.royalties;
                let tx=transferor.decodedTx;
                let changes=transferor.changes;

                //create unsigned transaction
                hex = await wallet.createRawTransaction(inputs, outputs);

                //compute amount of DGB sent to miners
                let miningFee = 0n;
                for (let vx of tx.vin) miningFee += vx.value;
                for (let vx of tx.vout) miningFee -= vx.value;
                costs.push({type: "Mining Fees", amount: wallet.satToDecimal(miningFee, 8) + " DGB"});

                //compute number of DGB used in coloring
                let coloring = 0n;
                for (let vx of tx.vin) if (vx.assets !== undefined) coloring -= vx.value;
                for (let vx of tx.vout) if (vx.assets !== undefined) coloring += vx.value;
                costs.push({type: "Asset Output Creation", amount: wallet.satToDecimal(coloring, 8) + " DGB"});

                //compute royalty cost
                if (royalties > 0n) costs.push({type: "Asset Royalty", amount: wallet.satToDecimal(royalties, 8) + " DGB"});

                let burntAssets = 0n;
                for (let address in changes[assetId]) {
                    burntAssets -= changes[assetId][address];
                }
                if (burntAssets > 0n) costs.push({
                    type: "Burnt assets",
                    amount: wallet.satToDecimal(burntAssets, decimals) + " Assets"
                });
            }

            //return the change addresses
            await wallet.setChangeAddress(coinChange);

            return {costs, hex,change};
        } catch (e) {
            return {costs: [{type: e.message||e.toString(), amount: ""}], hex: ""};
        }
    })(req);
    res.status(200).json(response);
});

app.post('/api/wallet/build/assetIssuance.json',async(req,res)=>{
    let response;
    try {
        //decode inputs
        let {recipients,address: issuingAddress,options,metadata,password,tax}=req.body;
        const multipart=(password!==undefined);

        //double check valid tax location
        if (PERMANENT_ADDRESS[tax]===undefined) throw new ExpectedError("Invalid tax location");

        //get list of usable utxos(remove all utxos with less then 1000sat)
        let utxos = (await wallet.listUnspent(1, 99999999, [issuingAddress])).filter(({value}) => BigInt(value) >= 1000);
        if (utxos.length===0) throw new ExpectedError("No funds found on issuing address");

        //get change addresses
        let coinChange = await wallet.getChangeAddress();

        //sort recipients if password provided
        let recipientArray=[];
        for (let address in recipients) recipientArray.push({
            address,
            count:BigInt(recipients[address])
        });
        if (multipart) {
            recipientArray.sort((a,b)=>a.count-b.count);
        } else if (recipientArray.length>1023) {
            throw new ExpectedError("Invalid recipient count");
        }

        //keep going while there are any recipients left
        let hex=[];
        let costsObject={
            "Mining Fees": 0n,
            "Asset Output Creation": 0n,
            "Permanent Data Storage": 0n
        };
        let sha256Hash,assetId,cid;
        while (recipientArray.length>0) {
            //make list of recipients we will use
            let txRecipients={};
            let counts=multipart?0:0-1024;  //locked use all even if it will create an error
            let lastCount;
            while ((counts<=MAX_COUNT_FIT)&&(recipientArray.length>0)&&(Object.keys(txRecipients).length<1023)) {
                let {address,count}=recipientArray.pop();
                if (count!==lastCount) {
                    counts++;
                    lastCount=count;
                    recipientArray.push({address,count});
                } else {
                    txRecipients[address]=count;
                }
            }

            //set change output to same issuingAddress if more txs needed
            options.changeAddress = (recipientArray.length===0)?coinChange:issuingAddress;

            //modify output to match
            let issuer=new DigiAssetIssuer(metadata,options);
            await issuer.addUTXOs(utxos);
            await issuer.addOutputs(txRecipients);
            await issuer.build();
            let {inputs,outputs}=issuer.tx;
            assetId=issuer.assetId;
            sha256Hash=issuer.sha256Hash;
            cid=issuer.cid;

            //create unsigned transaction
            let txHex=await wallet.createRawTransaction(inputs, outputs);

            //if password present then sign the transactions
            if (multipart) txHex=await wallet.sign(txHex,password);

            //add to list of transactions
            hex.push(txHex);

            //compute amount of DGB sent to miners
            let miningFee = 0n;
            let coloring = 0n;
            let permanent = 0n;
            for (let vx of utxos) miningFee += vx.value;
            for (let vout in outputs) {
                let output=outputs[vout];
                let address = Object.keys(output)[0];
                if (address === "data") continue;
                // noinspection JSCheckFunctionSignatures
                let sats = BigInt(Math.round(parseFloat(output[address]) * 100000000));
                if (sats === 600n) coloring += sats;
                if (address === PERMANENT_ADDRESS[tax]) permanent = sats;
                if (address === issuingAddress) {
                    let rawData=await wallet.decodeRawTransaction(txHex);
                    utxos=[{
                        txid: rawData.txid,
                        vout: parseInt(vout),
                        value: BigInt(Math.round(parseFloat(rawData.vout[vout].value)*100000000)),
                        scriptPubKey: rawData.vout[vout].scriptPubKey
                    }];
                }
                miningFee -= sats;
            }
            costsObject["Mining Fees"]+=miningFee;
            costsObject["Asset Output Creation"]+=coloring;
            costsObject["Permanent Data Storage"]+=permanent;
        }

        //calculate total costs
        let costs=[];
        for (let type in costsObject) costs.push({type,amount: wallet.satToDecimal(costsObject[type],8) + " DGB"})

        //return the change addresses
        await wallet.setChangeAddress(coinChange);

        //return response
        response={costs,hex,sha256Hash,assetId,cid,signed: multipart};
    } catch (e) {
        response={costs: [{type: e.message||e.toString(), amount: ""}], hex: []};
    }
    res.status(200).json(response);
});

app.post('/api/wallet/change/use.json',async(req,res)=>{
    let response=true;
    try {
        let {address,label}=req.body;
        await wallet.useChangeAddress(address,label);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.post('/api/wallet/kyc.json',async(req,res)=>{
    let response;
    try {
        const {addresses,password,options}=req.body;
        /*
            type:   s - secret
                    d - donate
                    p - public
                    v - voter
         */
        if (!Array.isArray(addresses)) throw new ExpectedError("addresses must be an array of string");

        let pageVars={s: 3,a: {},t:"p"};
        if (options!==undefined) {
            const {type,pin,label,goal=0}=options;
            switch (type) {
                case "public":
                    break;

                case "donate":
                    if (label===undefined) throw new ExpectedError("donate type requires a label");
                    if (label.length<2) throw new ExpectedError("donate label must be at least 2 characters");
                    pageVars.l=label;
                    pageVars.g=goal;
                    pageVars.t="d";
                    break;

                case "secret":
                    if (pin===undefined) throw new ExpectedError("secret type requires a pin");
                    if (pin.length<4) throw new ExpectedError("secret pin must be at least 4 characters");
                    pageVars.p=pin;
                    pageVars.t="s";
                    break;

                case "voter":
                    pageVars.t="v";
                    if (addresses.length!==1) throw new ExpectedError("Invalid number of addresses selected");
                    break;

                default:
                    throw new ExpectedError("Unknown option type");
            }
        }

        //get signatures
        let date=new Date().toISOString().split('T')[0];
        for (let address of addresses) {
            let message=`I hereby certify that ${address} belongs to me and I grant digiassetX permission to certify this address.  Signed on ${date}`;
            let signature=await wallet.getSignature(address,message,password);
            pageVars.a[address]=[signature,date];
        }

        //compute desired url and return
        response='https://verified.digiassetx.com/?data='+Buffer.from(JSON.stringify(pageVars)).toString('base64');
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.post('/api/wallet/utxos.json',async(req,res)=>{
    let response;
    try {
        const {addresses}=req.body;
        response=await wallet.listUnspent(0,99999999,addresses);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.post('/api/wallet/send.json',async(req,res)=>{
    let response;
    try {
        const {hex,password}=req.body;
        response=await wallet.send(hex,password);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.post('/api/wallet/sendSigned.json',async(req,res)=>{
    let response;
    try {
        const {hex}=req.body;
        response=await wallet.sendRawTransaction(hex);
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.post('/api/wallet/digiId.json',async(req,res)=>{
    let response;
    try {
        //get inputs
        let {uri,assetId,address,password,test=false}=req.body;
        if (assetId!==undefined) address=await wallet.findAsset(assetId);

        //make DigiId request
        let signature=await wallet.getSignature(address,uri,password);
        let callback=(test?"http://":"https://")+uri.split("://")[1];
        screen.log("digi-id: "+callback);
        response=(await got.post(callback,{
            responseType:   "json",
            json:           {address,signature,uri}
        })).body;
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.post('/api/wallet/hash/write.json',multer().single('file'),async(req,res)=> {
    let response;
    try {
        //get the address that will publish the hash
        let {address,password,hash}=req.body;

        //find funds needed
        let utxos=await wallet.listUnspent(0,99999999,[address]);
        let balance=0n;
        let inputs=[];
        for (let utxo of utxos) {
            if (utxo.assets!==undefined) continue;
            balance+=utxo.value;
            inputs.push(utxo);
            if (balance>=1000n) break;
        }
        if (balance<1000n) throw new ExpectedError("Not enough funds");

        //create transaction
        let outputs=[{data: hash}];
        balance-=BigInt(txSize(inputs.length,2,hash.length));
        if (balance>=DUST) outputs.push(outputPair(address,balance));
        let rawHex=await wallet.createRawTransaction(inputs,outputs);
        let txid=await wallet.send(rawHex,password);
        response={hash,txid};
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/*___  _      _ ___      _
 |   \(_)__ _(_) _ )_  _| |_ ___
 | |) | / _` | | _ \ || |  _/ -_)
 |___/|_\__, |_|___/\_, |\__\___|
        |___/       |__/
 */
app.post('/api/digibyte/checkAddress.json',(req,res)=>{
    let {address}=req.body;
    let response=true;
    let bech32=(address.toLowerCase()===address);
    try {
        bitcoin.address[bech32?"fromBech32":"fromBase58Check"](address);
    } catch (e) {
        response=false;
    }
    res.status(200).json(response);
});

/*   _ _      _                 _  __  __
  __| (_)__ _(_)__ _ ______ ___| |_\ \/ /
 / _` | / _` | / _` (_-<_-</ -_)  _|>  <
 \__,_|_\__, |_\__,_/__/__/\___|\__/_/\_\
        |___/
 */
app.post('/api/digiassetX/asset/permanent.json',async(req,res)=>{
    let response;
    try {
        const {metadata}=req.body;
        let {state,peer}=(await got.post('https://ipfs.digiassetX.com/checkNew.json',{
            responseType:   "json",
            json:           {metadata}
        })).body;
        if (peer!==undefined) {
            // noinspection ES6MissingAwait
            new Promise(async(resolve) => {
                try {
                    await ipfs.addPeer(peer);
                } catch (_) {}
                resolve();
            })
        }
        response=state;
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.get('/api/digiassetX/ipfs/check.json',async(req,res)=>{
    let response;
    try {
        let peerId=await config.peerId();
        response=(await got.post('https://ipfs.digiassetX.com/reachable.json',{
            responseType:   "json",
            json:           {peerId}
        })).body;
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.get('/api/digiassetX/payout/daily.json',async(req,res)=>{
    let response;
    try {
        response=config.get("permanent").daily;
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

app.get('/api/digiassetX/ipfs/verified.json',async(req,res)=>{
    let response;
    try {
        let peerId=await config.peerId();
        response=(await got.post('https://ipfs.digiassetX.com/verified.json',{
            responseType:   "json",
            json:           {peerId}
        })).body;
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
});

/*___ _ _
 | __(_) |___
 | _|| | / -_)
 |_| |_|_\___|
 */
app.post('/api/file/hash.json',multer().single('file'),async(req,res)=> {
    let response;
    try {
        //get files hash

        // noinspection JSUnresolvedVariable
        let file=req.file;
        response=crypto.createHash('sha256').update(file.buffer).digest('hex');
    } catch (e) {
        response=processError(e);
    }
    res.status(200).json(response);
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
let port=mainConfig.port;
let startInterface=()=>app
    .listen(port, () => screen.green("User Interface", `Running at http://127.0.0.1:${port}`))
    .on('error', ()=>{
        screen.red("User Interface","Failed to load");
        port++;
        startInterface();
    });
startInterface();