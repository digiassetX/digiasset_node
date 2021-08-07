# DigiAsset IPFS Metadata Server Binaries

Thanks for your interest in supporting the DigiAsset Network.  This tool creates a DigiAsset Node on your computer.  Which:

- Helps distribute DigiAsset metadata between nodes and those looking for Asset Data
- Allows you to see the contents of all DigiAssets that have been created so far

### Install - PC/Mac/Linux:

1) Copy the file that corresponds to your operating system
   [Windows](digiasset_ipfs_metadata_server-win.exe),
   [macOS](digiasset_ipfs_metadata_server-macos),
   [Linux](digiasset_ipfs_metadata_server-linux)
2) Install IPFS Desktop(https://docs.ipfs.io/install/ipfs-desktop/)
3) Run the program
4) Forward port 4001 to this machine
5) Go to http:127.0.0.1:8090 to see the user interface.

### Install - Raspberry Pi:

1) Install IPFS Daemon (https://snapcraft.io/install/ipfs/raspbian)

```bash
# Install Snapd
sudo apt update
sudo apt install snapd

# Reboot raspberry Pi
sudo reboot

# Install snap core to get the latest snapd
sudo snap install core

# Install the IPFS daemon
sudo snap install ipfs

# Inilitialise the IPFS daemon
ipfs init
```

2) Install DigiAsset IPFS Metadata Server
```bash
# go to the folder you want it to be installed in(sub folder will be created)
cd ~

# clone the git
git clone https://github.com/digiassetX/digiasset_ipfs_metadata_server

# go in to the app folder
cd digiasset_ipfs_metadata_server

# install dependencies
npm install
```

3) Run the  DigiAsset IPFS Metadata Server

```bash
# Launch IPFS daemon (Launch in a seperate window using a terminal multiplex like tmux/screen etc.)
ipfs daemon

# Launch DigiAsset IPFS Metadata Server (Launch in a seperate window using a terminal multiplex like tmux/screen etc.)
cd ~/digiasset_ipfs_metadata_server
node index.js
```

### Future features:

In the near future DigiAsset V3 Asset creator will be added to this software, so you can create assets on your own machine.
