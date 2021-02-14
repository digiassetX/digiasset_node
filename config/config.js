module.exports={
    bucket: 'chaindata-digibyte',
    s3: {
        accessKeyId:        'REDACTED',
        secretAccessKey:    'REDACTED'
    },
    includeMedia:   {               //set to false if not to include media
        maxSize:    1000000,        //max file size to accept in bytes.  Default 1MB
        names:      ["icon"],       //comment out line if all names accepted
        mimeTypes:  ["image/png","image/jpg","image/gif"]   //comment out line if all types accepted
    },
    timeout:        6000000,        //max number of ms to look for a ipfs object.  Default 100min
    port:           8090,           //page to see what is stored on your server will be available at http://serverip:port/
    ipfsViewer:     ".ipfs.localhost:8080",
    scanDelay:      15000000,        //delay in ms between scans for new assets.  Default is 1000 blocks

    messaging:      {}              //do not change
}
