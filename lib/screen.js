const logSize=5;
const longestIndex=15;

const green="\x1b[32m";
const yellow="\x1b[33m";
const red="\x1b[31m";
const reset="\x1b[0m";
let lines=["\x1b[33m  _____  _       _                       _     __  __      _            _       _        "," |  __ \\(_)     (_)   /\\                | |   |  \\/  |    | |          | |     | |       "," | |  | |_  __ _ _   /  \\   ___ ___  ___| |_  | \\  / | ___| |_ __ _  __| | __ _| |_ __ _ "," | |  | | |/ _` | | / /\\ \\ / __/ __|/ _ \\ __| | |\\/| |/ _ \\ __/ _` |/ _` |/ _` | __/ _` |"," | |__| | | (_| | |/ ____ \\\\__ \\__ \\  __/ |_  | |  | |  __/ || (_| | (_| | (_| | || (_| |"," |_____/|_|\\__, |_/_/    \\_\\___/___/\\___|\\__| |_|  |_|\\___|\\__\\__,_|\\__,_|\\__,_|\\__\\__,_|","            __/ | ","           |___/  ",
    "\x1b[0mThanks for installing DigiAsset Metadata Server","","\x1b[34mStatus:\x1b[0m"];




let states={}
const addIndex=(index,initialText)=>{
    states[index]=lines.length;
    lines.push((index+": ").padEnd(longestIndex+2," ")+initialText)
}
addIndex("IPFS Desktop",yellow+"Initializing"+reset);
addIndex("Template Folder", yellow+"Initializing"+reset);
addIndex("User Interface", yellow+"Initializing"+reset);
addIndex("List Publishing",yellow+"Initializing"+reset);
addIndex("Security", yellow+"Initializing"+reset);
addIndex("Wallet", yellow+"Initializing"+reset);
addIndex("Stream", yellow+"Initializing"+reset);
addIndex("Block Height", yellow+"Initializing"+reset);
lines.push("\x1b[34m");
addIndex("Log","\x1b[0m");


let logMode=false;
module.exports.logMode=()=>{
    logMode=true;
}

module.exports.green=(index,text)=>{
    lines[states[index]]=(index+": ").padEnd(longestIndex+2," ")+green+text+reset;
    draw();
}
module.exports.yellow=(index,text)=>{
    lines[states[index]]=(index+": ").padEnd(longestIndex+2," ")+yellow+text+reset;
    draw();
}
module.exports.red=(index,text)=>{
    lines[states[index]]=(index+": ").padEnd(longestIndex+2," ")+red+text+reset;
    draw();
}
module.exports.draw=draw=()=>{
    if (logMode) return;

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
module.exports.log=log=(text)=>{
    if (logMode) {
        console.log(text);
    } else {
        lines.push(text);
        if (lines.length > states["Log"] + logSize + 1) lines.splice(states["Log"] + 1, 1);
        draw();
    }
}
module.exports.getStatus=()=>{
    return lines.slice(states["IPFS Desktop"],states['Log']-1);
}