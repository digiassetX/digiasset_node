const config=require('./lib/config');

const {port}=config.get('main');

//Print Header
let lines=["\x1b[5m\x1b[33m  _____  _       _                       _   "," |  __ \\(_)     (_)   /\\                | |  "," | |  | |_  __ _ _   /  \\   ___ ___  ___| |_ "," | |  | | |/ _` | | / /\\ \\ / __/ __|/ _ \\ __|"," | |__| | | (_| | |/ ____ \\\\__ \\__ \\  __/ |_ "," |_____/|_|\\__, |_/_/    \\_\\___/___/\\___|\\__|","            __/ |                            ","  __  __   |___/           _       _         "," |  \\/  |    | |          | |     | |        "," | \\  / | ___| |_ __ _  __| | __ _| |_ __ _  "," | |\\/| |/ _ \\ __/ _` |/ _` |/ _` | __/ _` | "," | |  | |  __/ || (_| | (_| | (_| | || (_| | "," |_|  |_|\\___|\\__\\__,_|\\__,_|\\__,_|\\__\\__,_| ","        / ____|                              ","       | (___   ___ _ ____   _____ _ __      ","        \\___ \\ / _ \\ '__\\ \\ / / _ \\ '__|     ","        ____) |  __/ |   \\ V /  __/ |        ","       |_____/ \\___|_|    \\_/ \\___|_| ",
    "\x1b[0mThanks for installing DigiAsset Metadata Server.  To view the user interface in a browser enter http://127.0.0.1:"+port+" on first login it is recommended to add a username and password so others can not manipulate this server."];
for (let line of lines) console.log(line);

require('./lib/api');
require('./lib/syncer');