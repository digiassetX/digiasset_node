##Step 1 (Install IPFS Desktop):
1. Follow instructions at https://docs.ipfs.io/install/ipfs-desktop/
2. Forward port 4001 to this machine
3. If planning to run this all the time you may want to set IPFS to run on boot.  In linux I did that by running ```crontab -e``` and adding ```@reboot /usr/local/bin/ipfs daemon```

##Step 2 (Install NodeJS):
1. Follow instructions at https://nodejs.org/en/download/

##Step 3 (Install this app):
1) Copy files to a folder
2) In console run ```npm install```

##Step 4 (Run the program):
##### To run once
1. in a command line type ```node index.js```

##### To run continuously in the background in linux
1. Install PM2 by following instructions at https://www.vultr.com/docs/how-to-setup-pm2-on-ubuntu-16-04
2. Add the app by running ```pm2 start index.js --name meta```
3. To save so it starts on next boot ```pm2 save```
3. You can check console logs by typing ```pm2 log meta```

#Step 5 (View Loaded Meta Data):
1. Open a web browser 
2. In the address bar not the search bar enter ```http://127.0.0.1:8090/```
3. You can now view any meta data that has been stored to your server, mark it as acceptable and delete content that is offensive.