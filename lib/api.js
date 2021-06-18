const apiVersion=2;    //if changing interface in this file update /template/js/api.js to match

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
const isLoggedIn=(req)=>((mainConfig.users===false)||(req.session.login===true));

app.post('/api/login.json',session,async(req,res)=>{
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
        res.status(401).json({error: "Invalid username or password"});
    }
});

app.get('/api/logout.json',session,async(req,res)=>{
    screen.log("Logged out");
    req.session.login=false;
    res.status(200).json(true);
});

app.get('/api/userState.json',session,async(req,res)=>{
    let state=isLoggedIn(req)
    res.status(200).json(state);
});

app.all('/api/*',session,async(req,res,next)=>{
    // noinspection JSUnresolvedVariable
    if (isLoggedIn(req)) return next();
    res.status(401).json({error: "Not logged in"});
});



/* ___           __ _
  / __|___ _ _  / _(_)__ _
 | (__/ _ \ ' \|  _| / _` |
  \___\___/_||_|_| |_\__, |
                     |___/
 */

app.post('/api/config/addUser.json',async(req,res)=>{
    try {
        //verify inputs
        const {user, pass} = req.body;
        if ((user===undefined)||(pass===undefined)) throw "Missing input";
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
        console.log(e);
        res.status(500).json({error:e.toString()});
    }
});
if (mainConfig.users===false) {
    screen.red("Security","No Password Set");
} else {
    screen.green("Security","Secured");
}
app.get('/api/config/users.json',(req, res) => {
    if (mainConfig.users===false) {
        res.status(200).json([]);
    } else {
        res.status(200).json(Object.keys(mainConfig.users));
    }
});
app.post('/api/config/remove.json',(req, res) => {
    if ((mainConfig.users===false)||(mainConfig.users[req.body.user]===undefined)) {
        res.status(200).json({error:"User does not exist"});
    } else if (Object.keys(mainConfig.users).length===1) {
        res.status(200).json({error:"Can't remove only user"});
    } else {
        delete mainConfig.users[req.body.user];
        config.set("main",mainConfig);
        res.status(200).json(true);
    }
});





/*_   __          _          _
 \ \ / /__ _ _ __(_)___ _ _ (_)_ _  __ _
  \ V / -_) '_(_-< / _ \ ' \| | ' \/ _` |
   \_/\___|_| /__/_\___/_||_|_|_||_\__, |
                                   |___/
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
        let [major,minor]=version.split(".");
        if (major>apiVersion) {
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

    //delete zipfile
    await fs.promises.unlink('template.zip');

    //update records
    mainConfig.templateVersion=version;
    config.set("main",mainConfig);
    screen.green("Template Folder","Updated to "+version);
}
if (!fs.existsSync('template')) {
    screen.red("Template Folder","Missing");
    downloadVersion();
} else {
    screen.green("Template Folder","Version "+(mainConfig.templateVersion||"NA"));
}
app.get('/api/version/list.json',async(req,res)=>{
    try {
        let data=await getVersions();
        res.status(200).json(data);
    } catch (_) {
        res.status(500).json({error:"Unexpected Error"});
    }
});
app.get('/api/version/current.json',async(req,res)=>{
    try {
        res.status(200).json(mainConfig.templateVersion||"NA");
    } catch (_) {
        res.status(500).json({error:"Unexpected Error"});
    }
});
app.post('/api/version/update',async(req,res)=>{
    try {
        if (req.body.version==="newest") req.body.version=undefined;
        await downloadVersion(req.body.version);
        res.status(200).json(true);
    } catch (e) {
        res.status(200).json({error: e.toString()});
    }
});


/*___ ___ ___ ___   _    _    _
 |_ _| _ \ __/ __| | |  (_)__| |_ ___
  | ||  _/ _|\__ \ | |__| (_-<  _(_-<
 |___|_| |_| |___/ |____|_/__/\__/__/
 */
app.get('/api/cid/list_all.json',async(req,res)=>{
    try {
        res.status(200).json(await ipfsList.all());
    } catch (_) {
        res.status(500);
    }
});
app.get('/api/cid/list_approved.json',async(req,res)=>{
    res.status(200).json(await ipfsList.approved());
});
app.get('/api/cid/list_unsorted.json',async(req,res)=>{
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
    try {
        // noinspection JSUnresolvedVariable
        res.status(200).json(await ipfsList.addApprove(req.params.cid));
    } catch (_) {
        res.status(500);
    }
});

app.get('/api/reject/:cid',async(req,res)=>{
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
    // noinspection JSUnresolvedVariable
    let cid=req.params.cid;

    //get the requested data
    let cidData;
    try {
        cidData=await ipfs.cat(cid);
    } catch (e) {
        res.status(404).json({error:"Could not get requested data"});
        return;
    }

    try {
        //see if it is json
        let str=JSON.stringify(JSON.parse(cidData), null, 4);

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
        res.status(200).json({
            type:   "html",
            html:   html
        });
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
    res.status(200).json({
        type:   "url",
        src:    `http://${cid}${mainConfig.ipfsViewer}`
    });
});

/*___ _        _
 / __| |_ __ _| |_ _  _ ___
 \__ \  _/ _` |  _| || (_-<
 |___/\__\__,_|\__|\_,_/__/
 */
app.get('/api/last_block.json',async(req,res)=>{
    res.status(200).json(config.get("lastHeight")||"Loading");
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