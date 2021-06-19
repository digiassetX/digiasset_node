//min_api_version: 3

window.api={};

const post=async(url,data)=>{
    return new Promise(resolve=>{
        $.ajax({
            type: "POST",
            url,
            data,
            success: resolve,
            dataType: "json"
        });
    });
}

const get=async(url)=>$.getJSON(url);


window.api={
    user:   {
        login:  async(user,pass)=>post('/api/login.json',{user,pass}),
        logout: async()=>get('/api/logout.json'),
        state:  async()=>get('/api/userState.json'),
        add:    async(user,pass)=>post('/api/config/addUser.json',{user,pass}),
        remove: async(user)=>post('/api/config/remove.json',{user}),    //will return error if user doesn't exist or last user
        list:   async()=>get('/api/config/users.json')
    },
    getHeight:  async()=>get('/api/last_block.json'),
    list: {
        all:      async()=>get('/api/cid/list_all.json'),
        approved: async()=>get('/api/cid/list_approved.json'),
        unsorted: async()=>get('/api/cid/list_unsorted.json'),
        rejected: async()=>get('/api/cid/list_rejected.json')
    },
    approve:    async(cid)=>get('/api/approve/'+cid),
    reject:     async(cid)=>get('/api/reject/'+cid),
    cid:        async(cid)=>get('/api/cid/'+cid+'.html'),
    version: {
        list:   async()=>get('/api/version/list.json'),
        update: async(version="newest")=>post('/api/version/update',{version}),
        current:async()=>get('/api/version/current.json'),
    },
    config: {
        includeMedia: {
            maxSize: {
                get: async () => get('/api/config/includeMedia/getMaxSize.json'),
                set: async (size) => post('/api/config/includeMedia/setMaxSize.json', {size})
            },
            names: {
                acceptAll:  async()=>get('/api/config/includeMedia/acceptAllNames.json'),
                add:        async(name)=>post('/api/config/includeMedia/addName.json',{name}),
                remove:     async(name)=>post('/api/config/includeMedia/removeName.json',{name}),
                list:       async()=>get('/api/config/includeMedia/getNames.json')
            },
            mimeTypes: {
                acceptAll:  async()=>get('/api/config/includeMedia/acceptAllMimes.json'),
                add:        async(name)=>post('/api/config/includeMedia/addMime.json',{name}),
                remove:     async(name)=>post('/api/config/includeMedia/removeMime.json',{name}),
                list:       async()=>get('/api/config/includeMedia/getMimes.json')
            }
        },
        timeout: {
            get:    async()=>get('/api/config/timeout.json'),
            set:    async(timeInMS)=>post('/api/config/timeout.json',{time: timeInMS})
        },
        errorDelay: {
            get:    async()=>get('/api/config/errorDelay.json'),
            set:    async(timeInMS)=>post('/api/config/errorDelay.json',{time: timeInMS})
        },
        stream:     async(accessKeyId,secretAccessKey)=>post('/api/config/stream.json',{accessKeyId,secretAccessKey}),
        config:     async(user,pass,host="127.0.0.1",port=14022)=>post('/api/config/wallet.json',{user,pass,host,port})
    },
    wallet: {
        blockHeight:async()=>get('/api/wallet/height.json'),        //mainly there to test connection works
        addresses: {
            list:   async()=>get('/api/wallet/addresses.json'),
            kyc:    async(address,password=undefined)=>get('/api/wallet/kyc.json',{address,password}),  //gets the url to sign up for kyc
            new:    async(label="")=>post('/api/wallet/newAddress.json',{label})      //creates a new address
        },
        utxos:      async(addresses)=>post('/api/wallet/utxos.json',{addresses}),
        send:       async(from,to,password=undefined)=>post('/api/wallet/send.json',{from,to,password})
    },
    stream:         async(key)=>get('/api/stream/'+key+'.json')
}