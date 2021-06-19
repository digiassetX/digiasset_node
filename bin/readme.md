# DigiAsset IPFS Metadata Server Binaries

Thanks for your interest in supporting the DigiAsset Network.  This tool creates a DigiAsset Node on your computer.  Which:

- Helps distribute DigiAsset metadata between nodes and those looking for Asset Data
- Allows you to see the contents of all DigiAssets that have been created so far

### Install:

1) Copy the file that corresponds to your operating system
   [Windows](digiasset_ipfs_metadata_server-win.exe),
   [macOS](digiasset_ipfs_metadata_server-macos),
   [Linux](digiasset_ipfs_metadata_server-linux)
2) Install IPFS Desktop(https://docs.ipfs.io/install/ipfs-desktop/)
3) Run the program

### Install Raspberry Pi:

1) Install IPFS Daemon(https://snapcraft.io/install/ipfs/raspbian)
2) Install the app
```bash
# go to the folder you want it to be installed in(sub folder will be created)
cd ~

# clone the git
git clone https://github.com/digiassetX/digiasset_ipfs_metadata_server

# go in to the app folder
cd digiasset_ipfs_metadata_server

# install dependencies
npm install

# run the app
node index.js
```

### Future features:

In the near future DigiAsset V3 Asset creator will be added to this software, so you can create assets on your own machine.