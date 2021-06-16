const version=1;    //if changing interface in this file update /template/js/api.js to match

const config=require('./config');
const mainConfig=config.get("main");
const fs=require('fs');
const fsPromises = fs.promises;
const mime= require('mime-types');
const ipfsList=require('./ipfs_lists');
const ipfs=require('ipfs-simple');
const crypto=require('crypto');
const screen=require('./screen');
const got=require('got');
const unzipper=require("unzipper");
const path = require('path');

const consolePrinter=(data)=>{
    if (mainConfig.quiet) return;
    console.log(data);
}

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

/*
██╗      ██████╗  ██████╗ ██╗███╗   ██╗
██║     ██╔═══██╗██╔════╝ ██║████╗  ██║
██║     ██║   ██║██║  ███╗██║██╔██╗ ██║
██║     ██║   ██║██║   ██║██║██║╚██╗██║
███████╗╚██████╔╝╚██████╔╝██║██║ ╚████║
╚══════╝ ╚═════╝  ╚═════╝ ╚═╝╚═╝  ╚═══╝
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

app.post('/api/login.json',session,async(req,res)=>{
    consolePrinter("/api/login.json");
    try {
        if (mainConfig.users !== false) {
            const {user, pass} = req.body;
            if (mainConfig.users===undefined) throw "Invalid User Name";
            let code = hashPass(mainConfig.users[user].salt,user,pass);
            if (code !== mainConfig.users[user].hash) throw "Invalid Hash";
        }

        // noinspection JSUnresolvedVariable
        req.session.login=true;
        res.status(200).json(true);
    } catch (_) {
        res.status(401).json({error: "Invalid username or password"});
    }
});

app.get('/api/logout.json',session,async(req,res)=>{
    consolePrinter("/api/logout.json");
    req.session.login=false;
});

app.get('/api/userState.json',session,async(req,res)=>{
    consolePrinter("/api/userState.json");
    res.status(200).json((mainConfig.users===false)||req.session.login);
});

app.all('/api/*',session,async(req,res,next)=>{
    consolePrinter("/api/*");
    // noinspection JSUnresolvedVariable
    if ((mainConfig.users===false)||(req.session.login===true)) return next();
    res.status(401).json({error: "Not logged in"});
});



/* ___           __ _
  / __|___ _ _  / _(_)__ _
 | (__/ _ \ ' \|  _| / _` |
  \___\___/_||_|_| |_\__, |
                     |___/
 */

app.post('/api/config/addUser.json',async(req,res)=>{
    consolePrinter("/api/config/addUser.json");
    try {
        //verify inputs
        const {user, pass} = req.body;
        if ((user===undefined)||(pass===undefined)) throw "Missing input";
        if (mainConfig.users===false) mainConfig.users={};
        if (mainConfig.users[user]!==undefined) throw "Username already set";

        //create entry
        let salt='';
        for (let i=0;i<20;i++) salt+=Math.floor(Math.random()*16).toString(16);
        mainConfig.users[user]={salt,user:hashPass(salt,user,pass)};

        //save and return
        screen.green("Security","Secured");
        config.set("main",mainConfig);
        res.status(200).json(true);
    } catch (e) {
        console.log(e);
        res.status(500).json({error:e.toString()});
    }
});
if (mainConfig.users===false) {
    screen.red("Security","No Password Set");
} else {
    screen.green("Security","Secured");
}




/*_      __           _             _
 \ \    / /          (_)           (_)
  \ \  / /__ _ __ ___ _  ___  _ __  _ _ __   __ _
   \ \/ / _ \ '__/ __| |/ _ \| '_ \| | '_ \ / _` |
    \  /  __/ |  \__ \ | (_) | | | | | | | | (_| |
     \/ \___|_|  |___/_|\___/|_| |_|_|_| |_|\__, |
                                             __/ |
                                            |___/
 */
/**
 * Gets a list of versions
 * @return {Promise<{compatible:string[],newer:string[]?}>}
 */
const getVersions=async()=>{
    let data={compatible:[]};
    let {body}=await got.get("https://versions.digiassetX.com/digiasset_ipfs_metadata_server/versions.json",{responseType:"json"});
    for (let version of body) {
        let [major,minor]=version.split(".");
        if (major>version) {
            if (data.newer===undefined) data.newer=[];
            data.newer.push(version);
        } else {
            data.compatible.push(version);
        }
    }
    return data;
}

/**
 * Download template file
 * @param {string} version? - if excluded downloads the most recent
 * @return {Promise<void>}
 */
const downloadVersion=async(version)=>{
    if (version===undefined) {
        let {compatible}=await getVersions();
        version=compatible.pop();   //use most recent
    }
    screen.log("version:"+version);

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
                .on("error", (error) => reject(`Download failed`));

            fileWriterStream
                .on("error", (error) => reject(`Could not save download`))
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

    //delete file
    await fs.promises.unlink('template.zip');
    screen.green("Template Folder","Updated to "+version);
}
if (!fs.existsSync('template')) {
    screen.red("Template Folder","Missing");
    downloadVersion();
} else {
    screen.green("Template Folder","Found");
}




/*___ ___ ___ ___   _    _    _
 |_ _| _ \ __/ __| | |  (_)__| |_ ___
  | ||  _/ _|\__ \ | |__| (_-<  _(_-<
 |___|_| |_| |___/ |____|_/__/\__/__/
 */
app.get('/api/cid/list_all.json',async(req,res)=>{
    consolePrinter("/api/cid/list_all.json");
    try {
        res.status(200).json(await ipfsList.all());
    } catch (_) {
        res.status(500);
    }
});
app.get('/api/cid/list_approved.json',async(req,res)=>{
    consolePrinter("/api/cid/list_approved.json");
    res.status(200).json(await ipfsList.approved());
});
app.get('/api/cid/list_unsorted.json',async(req,res)=>{
    consolePrinter("/api/cid/list_unsorted.json");
    try {
        //get lists

        /** @type {string[]}*/let approved=await ipfsList.approved();
        /** @type {string[]}*/let rejected=await ipfsList.rejected();


        /** @type {string[]}*/let unsorted=(await ipfsList.all())
            .filter(cid => approved.indexOf(cid)===-1)
            .filter(cid => rejected.indexOf(cid)===-1)


        res.status(200).json(unsorted);
    } catch (_) {
        res.status(500);
    }
});
app.get('/api/cid/list_rejected.json',async(req,res)=>{
    consolePrinter("/api/cid/list_rejected.json");
    try {
        res.status(200).json(await ipfsList.rejected());
    } catch (_) {
        res.status(500);
    }
});

/*_    _    _     __  __           _           _      _   _
 | |  (_)__| |_  |  \/  |__ _ _ _ (_)_ __ _  _| |__ _| |_(_)___ _ _
 | |__| (_-<  _| | |\/| / _` | ' \| | '_ \ || | / _` |  _| / _ \ ' \
 |____|_/__/\__| |_|  |_\__,_|_||_|_| .__/\_,_|_\__,_|\__|_\___/_||_|
                                    |_|
 */
app.get('/api/approve/:cid',async(req,res)=>{
    consolePrinter("/api/approve/"+req.params.cid);
    try {
        // noinspection JSUnresolvedVariable
        res.status(200).json(await ipfsList.addApprove(req.params.cid));
    } catch (_) {
        res.status(500);
    }
});

app.get('/api/reject/:cid',async(req,res)=>{
    consolePrinter("/api/reject/"+req.params.cid);
    try {
        // noinspection JSUnresolvedVariable
        res.status(200).json(await ipfsList.addReject(req.params.cid));
    } catch (_) {
        res.status(500);
    }
});


/*___ ___ ___ ___   ___       _
 |_ _| _ \ __/ __| |   \ __ _| |_ __ _
  | ||  _/ _|\__ \ | |) / _` |  _/ _` |
 |___|_| |_| |___/ |___/\__,_|\__\__,_|
 */
app.get('/api/cid/:cid.html',async(req,res,next)=>{
    consolePrinter("/api/cid/"+req.params.cid+".html");
    // noinspection JSUnresolvedVariable
    let cid=req.params.cid;
    try {

        //see if data is json
        let data=await ipfs.catJSON(cid);
        let str=JSON.stringify(data, null, 4);

        //split to line by line
        let lines=str.split("\n");

        //look for encoded images
        let html='<html><head><style>.json{font-family: monospace;white-space: pre;}</style></head><div class="json">';
        for (let line of lines) {
            let index=line.indexOf(': "data:image/');
            if (index===-1) {
                html += line + "\n";
            } else {
                html += line.substr(0,index+2)+'</div>';//add the header and finish div
                let length=line.length-index-4-(line.endsWith(","));//get length to keep(all that remains unless ends with a , then 1 less character
                html += '<img src="'+line.substr(index+3)+'"><div class="json">';
            }
        }
        html+='</div></html>';
        res.status(200).json({
            type:   "html",
            html
        });



    } catch (_) {
        console.log(_);
        res.status(200).json({
            type:   "url",
            src:    `http://${cid}${mainConfig.ipfsViewer}`
        });
    }
});

/*___ _        _
 / __| |_ __ _| |_ _  _ ___
 \__ \  _/ _` |  _| || (_-<
 |___/\__\__,_|\__|\_,_/__/
 */
app.get('/api/last_block.json',async(req,res)=>{
    consolePrinter("/api/last_block.json");
    res.status(200).json(config.get("lastHeight")||"Loading");
});




/*_      __   _      ___
 \ \    / /__| |__  | _ \__ _ __ _ ___
  \ \/\/ / -_) '_ \ |  _/ _` / _` / -_)
   \_/\_/\___|_.__/ |_| \__,_\__, \___|
                             |___/
 */
app.get('*',async(req,res)=>{
    consolePrinter(req.path);
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