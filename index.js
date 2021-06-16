const fs=require('fs');

//Print Header
const screen=require('./lib/screen');
screen.draw();
require('./lib/api');
require('./lib/syncer');