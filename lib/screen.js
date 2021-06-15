const config=require('./config');

const green="\x1b[32m";
const yellow="\x1b[33m";
const red="\x1b[31m";
const reset="\x1b[0m";
const readline=require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})
let lines=["\x1b[33m  _____  _       _                       _   "," |  __ \\(_)     (_)   /\\                | |  "," | |  | |_  __ _ _   /  \\   ___ ___  ___| |_ "," | |  | | |/ _` | | / /\\ \\ / __/ __|/ _ \\ __|"," | |__| | | (_| | |/ ____ \\\\__ \\__ \\  __/ |_ "," |_____/|_|\\__, |_/_/    \\_\\___/___/\\___|\\__|","            __/ |                            ","  __  __   |___/           _       _         "," |  \\/  |    | |          | |     | |        "," | \\  / | ___| |_ __ _  __| | __ _| |_ __ _  "," | |\\/| |/ _ \\ __/ _` |/ _` |/ _` | __/ _` | "," | |  | |  __/ || (_| | (_| | (_| | || (_| | "," |_|  |_|\\___|\\__\\__,_|\\__,_|\\__,_|\\__\\__,_| ","        / ____|                              ","       | (___   ___ _ ____   _____ _ __      ","        \\___ \\ / _ \\ '__\\ \\ / / _ \\ '__|     ","        ____) |  __/ |   \\ V /  __/ |        ","       |_____/ \\___|_|    \\_/ \\___|_| ",
    "\x1b[0mThanks for installing DigiAsset Metadata Server","","\x1b[34mStatus:\x1b[0m"];




let states={}
const addIndex=(index,initialText)=>{
    states[index]=lines.length;
    lines.push(index+": "+initialText)
}
addIndex("IPFS Desktop",yellow+"Initializing"+reset);
addIndex("Template Folder", yellow+"Initializing"+reset);
addIndex("User Interface", yellow+"Initializing"+reset);
addIndex("Security", yellow+"Initializing"+reset);
addIndex("Wallet", "NA");

module.exports.green=(index,text)=>{
    lines[states[index]]=index+": "+green+text+reset;
    draw();
}
module.exports.yellow=(index,text)=>{
    lines[states[index]]=index+": "+yellow+text+reset;
    draw();
}
module.exports.red=(index,text)=>{
    lines[states[index]]=index+": "+red+text+reset;
    draw();
}
module.exports.draw=draw=()=>{
    //clear
    for (let index in lines) {
        process.stdout.cursorTo(0);
        process.stdout.clearLine(0);
        process.stdout.write("\033[F");
    }
    //redraw
    for (let line of lines) {
        process.stdout.write(line+"\n");
    }
}