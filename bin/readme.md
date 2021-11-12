# DigiAsset IPFS Metadata Server Binaries

Thanks for your interest in supporting the DigiAsset Network.  This tool creates a DigiAsset Node on your computer.  Which:

- Helps distribute DigiAsset metadata between nodes and those looking for Asset Data
- Allows you to see the contents of all DigiAssets that have been created so far
- Create your own v3 DigiAssets on your own server via the web interface (Coming Soon)

To learn more about DigiAssets go [here](https://digibyte.org/en-gb/#digiassets).

## Important

- Forward port 4001 to your DigiAsset IPFS Metadata server to ensure it is accessible over the internet
- Visit http://127.0.0.1:8090 to access the web interface


### Installation - PC/Mac/Linux:

1) Install IPFS Desktop (Instructions: https://docs.ipfs.io/install/ipfs-desktop/)
2) Download the DigiAsset Metadata Server:
   [Windows](digiasset_ipfs_metadata_server-win.exe),
   [macOS](digiasset_ipfs_metadata_server-macos),
   [Linux](digiasset_ipfs_metadata_server-linux)
3) Run the DigiAsset Metadata Server

Note:- 
- If you are planning to run this all the time, you may want to set IPFS to run on boot. In linux, you can do this by running ```crontab -e``` and the add ```@reboot /usr/local/bin/ipfs daemon``` to the bottom of the file. Save, quit and reboot.
- If the 'IPFS Desktop' status line says 'Running' in green, the DigiAsset Metadata server is working correctly. If the line is red, there is a problem with the IPFS daemon.
- The 'Security' status will likely say 'No Password Set'. This is the password for the web UI. You can create one by visiting the web UI, and adding a new user via the Settings menu.

### Installation - Raspberry Pi (headless):

If you are already running a DigiByte Full Node on a Raspberry Pi, these instructions will help you run the DigiAsset Metadata Server as well. 
(You don't need to run the DigiByte node for this this work, but if you can run both, why not!)

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
2) Install NodeJS (https://github.com/nodesource/distributions)

```bash
# Add NodeJS LTS repository (if you are using either Ubuntu or Debian)
# For Ubuntu:
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
# For Debian:
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -

# Update the local repos
sudo apt update

# 
sudo apt install nodejs

# Test it's working (this should display the version number)
node -v
```

3) Install DigiAsset Metadata Server
```bash
# go to the folder you want it to be installed in(sub folder will be created)
cd ~

# clone the git
git clone --depth 1 --branch apiV3 https://github.com/digiassetX/digiasset_node.git

# go in to the app folder
cd digiasset_node

# install dependencies
npm install
```

4) Run the IPFS Demon

```bash
# Launch IPFS daemon (Launch in a seperate window using a terminal multiplex like tmux/screen etc.)
ipfs daemon
```
Note:- If you are planning to run this all the time you may want to set IPFS to run on boot.  You can do this using crontab. Run ```crontab -e``` and add ```@reboot ipfs daemon``` to the bottom of the file. Save and quit, then reboot your Pi using ```sudo reboot```. Once rebooted you can check that the IPFS daemon is running by entering ```ps aux | grep ipfs```.

4) Run the DigiAsset Metadata Server

```bash
# Launch DigiAsset IPFS Metadata Server (Launch in a seperate window using a terminal multiplex like tmux/screen etc.)
cd ~/digiasset_ipfs_metadata_server
node index.js
```

Note:- 
- If the 'IPFS Desktop' status line says 'Running' in green, the DigiAsset Metadata Server is working correctly. If the line is red, there is a problem with the IPFS daemon.
- The 'Security' status will likely say 'No Password Set'. This is the password for the web UI. You can create one by visiting the web UI, and adding a new user via the Settings menu.
