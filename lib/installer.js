const fs = require('fs');
const got = require("got");
const screen = require("./screen");
const unzipper = require("unzipper");



module.exports=async(source)=> {
    let args = process.argv;
    if (args[0].indexOf("digiasset_node-") === -1) {

        //from source code check if dependencies are installed
        if (!fs.existsSync(source)) {
            console.log("\n\nPlease run \n\nnpm install\n\nbefore running this app.");
            process.exit();
        }

    } else {

        //from compiled code download prebuilds
        if (fs.existsSync("prebuilds")) return;
        let os=(args[0].indexOf("-win")!==-1)?"win":"linux";
        try {
            //download
            await new Promise((resolve, reject) => {
                const url = `https://ipfs.digiassetX.com/prebuilds_${os}.zip`;
                const downloadStream = got.stream(url);
                const fileWriterStream = fs.createWriteStream('prebuilds.zip');

                downloadStream
                    .on("downloadProgress", ({transferred, total, percent}) => {
                        const percentage = Math.round(percent * 100);
                        screen.yellow("IPFS", `Downloading: ${transferred}/${total} (${percentage}%)`);
                    })
                    .on("error", () => reject(`Download failed`));

                fileWriterStream
                    .on("error", () => reject(`Could not save download`))
                    .on("finish", ()=>resolve());

                downloadStream.pipe(fileWriterStream);
            });

            fs.mkdirSync('prebuilds');

            //unzip contents
            screen.yellow("IPFS","Unzipping");
            await fs.createReadStream('prebuilds.zip')
                .pipe(unzipper.Extract({ path: 'prebuilds' }))
                .on('entry', entry => entry.autodrain())
                .promise();

            //delete zipfile
            await fs.promises.unlink('prebuilds.zip');

        } catch (e) {
            screen.red("IPFS",e);
            process.exit();
        }
    }
}