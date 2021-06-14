module.exports={
    includeMedia:   {               //set to false if not to include media
        maxSize:    1000000,        //max file size to accept in bytes.  Default 1MB
        names:      ["icon"],       //comment out line if all names accepted
        mimeTypes:  ["image/png","image/jpg","image/gif"]   //comment out line if all types accepted
    },
    timeout:        6000000,        //max number of ms to look for a ipfs object.  Default 100min
    errorDelay:     600000,         //time to delay before retrying if there is an error 10min
    port:           8090,           //page to see what is stored on your server will be available at http://serverip:port/
    ipfsViewer:     ".ipfs.localhost:8080",
    scanDelay:      15000000,       //delay in ms between scans for new assets.  Default is 1000 blocks
    sessionLife:    86400000,       //how long sessions last default 24h
    users:          false,          //login credentials - default no credentials.  when credentials are required Object<{salt:string,hash:String}>
    messaging:      {}              //do not change
}