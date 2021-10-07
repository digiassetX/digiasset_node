const got=require("got");
const fs = require("fs");

let pending={};

module.exports.get=async(url,config)=>{
    let rnd=Math.floor(0x10000*Math.random()).toString(16).padStart(4,'0')+'|'+url;
    pending[rnd]=true;
    let results;
    try {
        results = await got.get(url, config);
    } catch (e) {
        fs.appendFileSync('_error.got.log',"GET: "+url+"\r\n"+this.stack+"\r\n-------------------------------\r\n");
        delete pending[rnd];
        throw e;
    }
    delete pending[rnd];
    return results;
}
module.exports.post=async(url,config)=>{
    let rnd=Math.floor(0x10000*Math.random()).toString(16).padStart(4,'0')+'|'+url;
    pending[rnd]=true;
    let results;
    try {
        results = await got.post(url, config);
    } catch (e) {
        fs.appendFileSync('_error.got.log',"POST: "+url+"\r\n"+this.stack+"\r\n-------------------------------\r\n");
        delete pending[rnd];
        throw e;
    }
    delete pending[rnd];
    return results;
}



module.exports.stream=got.stream;
module.exports.writeAll=()=>{
    let data=Object.keys(pending).join("\r\n");
    fs.appendFileSync('_error.log',"Pending calls at time of error: \r\n"+data+"\r\n-------------------------------\r\n");
}