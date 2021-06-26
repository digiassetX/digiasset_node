//update every minute the last block scanned.  Value returned is multiple of 1000 blocks not individual block
let getHeight=async()=>{
    let height=await api.height();
    $("#last_block").html("<strong>Last Block Scanned</strong> : "+height);
}
setInterval(getHeight,60000);
getHeight();

const showError=(e)=>{
    $("#error_message").text(e);
    (new bootstrap.Modal(document.getElementById('ErrorModal'))).show();
}

//show the cid data
let lists={unsorted:[],approved:[]};
const drawControl=(row,column)=>{
    return `<button class="cell approve button btn btn-outline-success" data-column="${column}" data-assetid="${row.assetId}" data-cid="${row.cid}">✓</button><button class="cell reject button btn btn-outline-danger" data-column="${column}" data-assetid="${row.assetId}" data-cid="${row.cid}">X</button>`;
}
let dataTableUnsorted = $('#unsorted').DataTable({
    responsive: true,
    ajax: {
        url: '/api/list/unsorted.json',
        dataSrc: ''
    },
    order: [
        [1,"asc"]
    ],
    columns: [
        {
            className: 'columnControls',
            orderable:false,
            data: null, render: (data,type,row)=>`<button class="cell view button btn btn-outline-dark" data-assetid="${row.assetId}" data-cid="${row.cid}" data-list="unsorted">View</button>`
        },
        {
            className: 'columnAssetId',
            data: 'assetId',
            render: (data,type,row)=>`<button class="cell reject button btn btn-outline-danger" data-column="assetId" data-assetid="${row.assetId}" data-cid="${row.cid}">X</button>`+data
        },
        {
            className: 'columnCid',
            data: 'cid',
            render: (data,type,row)=>`<button class="cell approve button btn btn-outline-success" data-column="cid" data-assetid="${row.assetId}" data-cid="${row.cid}">✓</button><button class="cell reject button btn btn-outline-danger" data-column="cid" data-assetid="${row.assetId}" data-cid="${row.cid}">X</button>`+data
        }

    ]
});
let dataTableApproved = $('#approved').DataTable({
    responsive: true,
    ajax: {
        url: '/api/list/approved.json',
        dataSrc: ''
    },
    order: [
        [1,"asc"]
    ],
    columns: [
        {className: 'columnNarrowControls',orderable:false,data: null, render: (data,type,row)=>`<button class="cell view button btn btn-outline-dark" data-assetid="${row.assetId}" data-cid="${row.cid}" data-list="approved">View</button>`},
        {className: 'columnAssetId',data: 'assetId'},
        {className: 'columnCid',data: 'cid'}
    ]
});
let redraw=()=> {
    dataTableUnsorted.ajax.reload(null,false);
    dataTableApproved.ajax.reload(null,false);
}
setInterval(redraw,60000);

//handle view click event
let list="";
let showView=async(assetId,cid)=>{
    try {
        $("#window_data").attr('src', api.cid.page(cid));
        $("#window_approve").data('assetId',assetId).data('cid', cid);
        $("#window_reject").data('assetId',assetId).data('cid', cid);
        $("#window_reject_all").data('assetId',assetId).data('cid', cid);
        $("#window").show();
        $("#shadow").show();
    } catch (e) {
        showError(e);
    }
}
$(document).on('click','.view',function(){
    let assetId=$(this).data('assetId');
    let cid=$(this).data('cid');
    list=$(this).data('list');
    showView(assetId,cid);
});

const processARclick=(type,assetId,cid,column)=>{
    api[column][type](assetId,cid).then(redraw);

    //see if there are more and open next value if there are
    let old=(column==="cid")?cid:assetId;
    let next="";
    if (list!=="") {
        for (let line of lists[list]) {
            if (line[column]!==old) {
                next=line;
                break;
            }
        }
    }

    if (next==="") {
        //close if no more left
        $("#window").hide();
        $("#shadow").hide();
    } else {
        //open next if there are
        showView(next.assetId,next.cid);
    }

}

//handle approve click event
$(document).on('click','.approve',function(){
    //approve the meta data
    let column=$(this).data('column');
    let assetId=$(this).data('assetid');
    let cid=$(this).data('cid');
    processARclick("approve",assetId,cid,column);
});

//handle reject click event
$(document).on('click','.reject',function(){
    let column=($(this).data('column')==="cid")?"cid":"assetId";
    let assetId=$(this).data('assetid');
    let cid=$(this).data('cid');
    processARclick("reject",assetId,cid,column);
});

//handle close click event
$(document).on('click','.close',function(){
    list="";    //reset list value
    $("#window").hide();
    $("#shadow").hide();
    $("#window_data").attr('src','/blank.html');
});

//handle upgrade
$(document).on('click','#updateBtn',async()=>{
    let state=await api.version.update();
    if (state===true) {
        location.reload();
    } else {
        //todo state.error will have a message
    }
});

//check if newest
const isNewest=async()=>{
    let {compatible,newer,current}=await api.version.list();
    let newestAvailable=compatible.pop();
    console.log(newestAvailable);
    if (newestAvailable===current) {
        $("#updateBtn").hide();  //we have updated
    } else {
        $("#updateBtn").text(`Update Available (Version: ${newestAvailable})`).show();
    }
}
isNewest();//check at start
setInterval(isNewest,86400000);//recheck daily

//check if logged in
const showLoginBox=()=>(new bootstrap.Modal(document.getElementById('LoginModal'))).show();
$(document).ready(async()=>{
    let isLogedIn=await api.user.state();
    if (!isLogedIn) {
        //not logged in and needs to be
        showLoginBox();
        $("#menu_login").show();
    } else {
        //logged in or no login
        $("#menu_settings").removeAttr('disabled');     //enable settings
        let userList=await api.config.user.list();            //find out how many users there are
        if (userList.length>0) $("#menu_logout").show();      //actually logged in so show logout button

        //more then 1 user so enable the remove user option
        if (userList.length>1) {
            $("#menu_remove_user").show();
            for (let user of userList) {
                $('#remove_user').append(new Option(user, user));
            }
        }

        //if wallet set up enable kyc and create asset options
        try {
            await api.wallet.blockHeight();
            $('.needwallet').removeAttr('disabled');
        } catch (_) {}
    }
});
$(document).on('click','#menu_login',showLoginBox);

//handle login request
$(document).on('click','#login_submit',async()=>{
    let user=$("#login_user").val().trim();
    let pass=$("#login_pass").val().trim();
    try {
        await api.user.login(user,pass);
        location.reload();
    } catch(e) {
        showError(e);
    }
});

//handle logout request
$(document).on('click','#menu_logout',async()=>{
    await api.user.logout();
    location.reload();
});

//handle adding user
$(document).on('click','#menu_add_user',async()=>{
    (new bootstrap.Modal(document.getElementById('AddModal'))).show();
});
$(document).on('click','#add_submit',async()=>{
    let user=$("#add_user").val().trim();
    let pass=$("#add_pass").val().trim();
    try {
        await api.user.add(user,pass);
        //todo make better success screen
        location.reload();
    } catch(e) {
        showError(e);
    }
});

//handle remove user
$(document).on('click','#remove_user',async()=>{
    (new bootstrap.Modal(document.getElementById('RemoveModal'))).show();
});
$(document).on('click','#remove_submit',async()=>{
    let user=$("#remove_user").val().trim();
    try {
        await api.user.remove(user);
        location.reload();
    } catch(e) {
        showError(e);
    }
});

//handle configure wallet
$(document).on('click','#menu_wallet',async()=>{
    (new bootstrap.Modal(document.getElementById('WalletModal'))).show();
});
$(document).on('click','#wallet_auto',async()=>{
    let result=await api.config.wallet.auto();
    if (result===true) {
        //todo some kind of better success screen
        location.reload();
    } else if (result===false) {
        showError("Could not find wallets config file");
    } else {
        let randomUser="";
        let randomPassword="";
        for (let i=0;i<10;i++) {
            randomUser+=String.fromCharCode(65+Math.floor(Math.random()*26)+32*Math.floor(Math.random()*2));//Pick random upper or lower case letter
            randomPassword+=String.fromCharCode(65+Math.floor(Math.random()*26)+32*Math.floor(Math.random()*2));//Pick random upper or lower case letter
            randomPassword+=String.fromCharCode(65+Math.floor(Math.random()*26)+32*Math.floor(Math.random()*2));//Pick random upper or lower case letter
        }
        showError(`Found a wallet config file at ${result} but it was not configured correctly.<br><br>Please add<br>rpcuser=${randomUser}<br>rpcpassword=${randomPassword}<br>rpcbind=127.0.0.1<br>rpcport=14022<br>whitelist=127.0.0.1<br>rpcallowip=127.0.0.1`);
    }
});
$(document).on('click','#wallet_submit',async()=>{
    let user=$("#wallet_user").val().trim();
    let pass=$("#wallet_pass").val().trim();
    let host=$("#wallet_host").val().trim();
    let port=parseInt($("#wallet_port").val().trim());
    try {
        await api.config.wallet.set(user,pass,host,port);
        //todo make better success screen
        location.reload();
    } catch(e) {
        showError(e);
    }
});

//handle configure stream
$(document).on('click','#menu_stream',async()=>{
    (new bootstrap.Modal(document.getElementById('StreamModal'))).show();
});
$(document).on('click','#stream_submit',async()=>{
    let accessKeyId=$("#stream_accessKeyId").val().trim();
    let secretAccessKey=$("#stream_secretAccessKey").val().trim();
    try {
        await api.config.stream(accessKeyId,secretAccessKey);
        //todo make better success screen
        location.reload();
    } catch(e) {
        showError(e);
    }
});

//handle included media
$(document).on('click','#menu_included_media',async()=>{
    let currentData=await api.config.media.get();
    //current mime config format is awkward should make better.
    if (currentData===false){
        $("#im_maxsize").val("-1");
        $("#im_names").val("");
        $("#im_mimeTypes").val("");
    } else if (currentData===true){
        $("#im_maxsize").val("0");
        $("#im_names").val("0");
        $("#im_mimeTypes").val("0");
    } else {
        $("#im_maxsize").val(currentData.maxSize===true?"0":currentData.maxSize);
        $("#im_names").val(currentData.names===true?"0":JSON.stringify(currentData.names));
        $("#im_mimeTypes").val(currentData.mimeTypes===true?"0":JSON.stringify(currentData.mimeTypes));
    }
    (new bootstrap.Modal(document.getElementById('IncludedMediaModal'))).show();
});
$(document).on('click','#included_media_submit',async()=>{
    try {
        let maxSize=parseInt($("#im_maxsize").val().trim());
        let names=$("#im_names").val().trim();
        let mimeTypes=$("#im_mimeTypes").val().trim();

        let data;
        if (maxSize===-1) {
            data=false;
        } else if ((maxSize===0)&&(names==="0")&&(mimeTypes==="0")) {
            data=true;
        } else {
            maxSize=(maxSize===0)?true:maxSize;
            names=(names==="0")?true:JSON.stringify(names);
            mimeTypes=(mimeTypes==="0")?true:JSON.stringify(mimeTypes);
            data={maxSize,names,mimeTypes};
        }

        await api.config.media.set(data);
        //todo make better success screen
        location.reload();
    } catch(e) {
        showError(e);
    }
});