//min_api_version: 1

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

/**
 * Gets the current heights synced block
 * @return {Promise<int>}
 */
window.api={
    user:   {
        login:  async(user,pass)=>post('/api/login.json',{user,pass}),
        logout: async()=>get('/api/logout.json'),
        state:  async()=>get('/api/userState.json'),
        add:    async(user,pass)=>post('/api/config/addUser.json',{user,pass})
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
    cid:        async(cid)=>get('/api/cid/'+cid+'.html')
}