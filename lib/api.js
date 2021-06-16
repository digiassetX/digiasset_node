const config=require('./config');
const mainConfig=config.get("main");
const fsPromises = require('fs').promises;
const mime= require('mime-types');
const ipfsList=require('./ipfs_lists');
const ipfs=require('ipfs-simple');
const crypto=require('crypto');
const screen=require('./screen');


const consolePrinter=(data)=>{
    if (mainConfig.quiet) return;
    console.log(data);
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