##Step 1 (Install IPFS Desktop):
1. Follow instructions at https://docs.ipfs.io/install/ipfs-desktop/
2. Forward port 4001 to this machine
3. If planning to run this all the time you may want to set IPFS to run on boot.  In linux I did that by running ```crontab -e``` and adding ```@reboot /usr/local/bin/ipfs daemon```

##Step 2 (Install this app):
1) Copy file from bin folder for your OS to your computer
2) run it 

## Compile Instructions(for programmers)
```bash
#install pkg
npm install -g pkg

#if windows user run
"c:\Program Files\nodejs\nodevars.bat"

#compile
pkg . --no-bytecode --public-packages "*" --compress GZip
```



