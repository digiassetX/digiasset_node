const green="\x1b[32m";
const yellow="\x1b[33m";
const red="\x1b[31m";
const reset="\x1b[0m";




//Build screen
let states={};
let lines=["\x1b[33m  _____  _       _                       _     __  __      _            _       _        ","\x1b[33m |  __ \\(_)     (_)   /\\                | |   |  \\/  |    | |          | |     | |       ","\x1b[33m | |  | |_  __ _ _   /  \\   ___ ___  ___| |_  | \\  / | ___| |_ __ _  __| | __ _| |_ __ _ ","\x1b[33m | |  | | |/ _` | | / /\\ \\ / __/ __|/ _ \\ __| | |\\/| |/ _ \\ __/ _` |/ _` |/ _` | __/ _` |","\x1b[33m | |__| | | (_| | |/ ____ \\\\__ \\__ \\  __/ |_  | |  | |  __/ || (_| | (_| | (_| | || (_| |","\x1b[33m |_____/|_|\\__, |_/_/    \\_\\___/___/\\___|\\__| |_|  |_|\\___|\\__\\__,_|\\__,_|\\__,_|\\__\\__,_|","\x1b[33m            __/ | ","\x1b[33m           |___/  ",
    "Thanks for installing DigiAsset Metadata Server","","\x1b[34mStatus:\x1b[0m"];
const addIndex=(index,initialText)=>{
    states[index]=lines.length;
    lines.push(index+": "+initialText)
}
addIndex("IPFS Desktop",yellow+"Initializing");
addIndex("Template Folder", yellow+"Initializing");
addIndex("User Interface", yellow+"Initializing");
addIndex("Security", yellow+"Initializing");
addIndex("Wallet", "NA");
addIndex("Block Height", yellow+"Initializing");
lines.push("\x1b[34m");
addIndex("Log","\x1b[0m");

//redraw all lines
module.exports.draw=draw=()=>{
    //clear
    process.stdout.write("\x1b[2J");
    
    //redraw
    for (let line of lines) {
        process.stdout.write(line+reset+"\n");
    }
}
draw();

//allow redrawing specific line
const drawLine=(index)=>{
    let linesToMove=lines.length-index;
    process.stdout.write(`\x1b[${linesToMove}A${lines[index]}\x1b[0m\x1b[K\x1b[${linesToMove}B\r`);
}
module.exports.green=(index,text)=>{
    lines[states[index]]=index+": "+green+text+reset;
    drawLine(index);
}
module.exports.yellow=(index,text)=>{
    lines[states[index]]=index+": "+yellow+text+reset;
    drawLine(index);
}
module.exports.red=(index,text)=>{
    lines[states[index]]=index+": "+red+text+reset;
    drawLine(index);
}

//allow redrawing scrolling log
module.exports.log=(text)=>{
    //add to log
    lines.push(text);

    //make sure log will fit on the screen
    let index=states["Log"]+1:
    while (lines.length>process.stdout.rows) lines.splice(index,1);

    //redraw log lines
    let linesToMove=lines.length-index;
    process.stdout.write(`\x1b[${linesToMove}A`);
    for (;index<lines.length;i++) process.stdout.write(`${lines[index]}\x1b[0m\x1b[K\n`);
}
