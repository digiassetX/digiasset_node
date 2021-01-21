const config=require('../config/config');
const fsPromises = require('fs').promises;
const mime= require('mime-types');
const ipfsList=require('./ipfs_lists');
const ipfs=require('./ipfs');

const stream = require('stream');
const {promisify} = require('util');



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
/*
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
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
        /** @type {string[]}*/let all=await ipfsList.all();
        /** @type {string[]}*/let approved=await ipfsList.approved();

        //remove all values from all that are in approved
        const unsorted=all.filter(cid => approved.indexOf(cid)===-1);

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


app.get('/api/cid/:cid.html',async(req,res,next)=>{
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
        res.status(200).json({
            type:   "url",
            src:    `http://${cid}${config.ipfsViewer}`
        });
    }
});


app.get('/api/last_block.json',async(req,res)=>{
    res.status(200).json(config.messaging.lastBlock||"Loading");
});




app.get('/api/approve/:cid',async(req,res)=>{
    try {
        res.status(200).json(await ipfsList.addApprove(req.params.cid));
    } catch (_) {
        res.status(500);
    }
});

app.get('/api/reject/:cid',async(req,res)=>{
    try {
        res.status(200).json(await ipfsList.addReject(req.params.cid));
    } catch (_) {
        res.status(500);
    }
});

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
app.listen(config.port, () => console.log(`API Server running on port ${config.port}`));