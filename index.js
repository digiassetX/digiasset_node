const fs=require('fs');

//Print Header
const screen=require('./lib/screen');
if (!fs.existsSync('template')) {
    screen.red("Template Folder","Missing");
} else {
    screen.green("Template Folder","Found");
}
screen.draw();
require('./lib/api');
require('./lib/syncer');