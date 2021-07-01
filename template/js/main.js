//update every minute the last block scanned.  Value returned is multiple of 1000 blocks not individual block

let getHeight=async()=>{
    let height=await api.height();
    $("#last_block").html("<strong>Last Block Scanned</strong> : "+height);
}
setInterval(getHeight,60000);
// noinspection JSIgnoredPromiseFromCall
getHeight();

const showError=(e)=>{
    $("#error_message").text(e);
    (new bootstrap.Modal(document.getElementById('ErrorModal'))).show();
}

/**
 * Converts a sat int to string decimal
 * @param {int} value
 * @param {int} decimals
 * @return {string}
 */
const satToDecimal=(value,decimals)=>{
    let str=value.toString();
    if (decimals===0) return str;
    str=str.padStart(decimals+1,"0");
    let periodPoint=str.length-decimals;
    return str.substr(0,periodPoint)+'.'+str.substr(periodPoint);
}

jQuery.fn.dataTable.Api.register( 'processing()', function ( show ) {
    return this.iterator( 'table', function ( ctx ) {
        ctx.oApi._fnProcessingDisplay( ctx, show );
    } );
} );

/*
███╗   ███╗███████╗████████╗ █████╗     ██████╗  █████╗ ████████╗ █████╗     ██╗     ██╗███████╗████████╗███████╗
████╗ ████║██╔════╝╚══██╔══╝██╔══██╗    ██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗    ██║     ██║██╔════╝╚══██╔══╝██╔════╝
██╔████╔██║█████╗     ██║   ███████║    ██║  ██║███████║   ██║   ███████║    ██║     ██║███████╗   ██║   ███████╗
██║╚██╔╝██║██╔══╝     ██║   ██╔══██║    ██║  ██║██╔══██║   ██║   ██╔══██║    ██║     ██║╚════██║   ██║   ╚════██║
██║ ╚═╝ ██║███████╗   ██║   ██║  ██║    ██████╔╝██║  ██║   ██║   ██║  ██║    ███████╗██║███████║   ██║   ███████║
╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝    ╚══════╝╚═╝╚══════╝   ╚═╝   ╚══════╝
 */
let dataTable={};
const startDataTable=()=>dataTable={
    subscription: $('#subscription').DataTable({
        responsive: true,
        ajax: {
            url: '/api/list/subscriptions.json',
            dataSrc: ''
        },
        order: [
            [2, "asc"]
        ],
        columns: [
            {
                className: 'columnApproved',
                data: 'approved',
                render: (data, type, row) => (data===true)?"✓":""
            },
            {
                className: 'columnRejected',
                data: 'rejected',
                render: (data, type, row) => (data===true)?"X":""
            },
            {
                className: 'columnUrl',
                data: 'url'
            }
        ]
    }),
    unsorted: $('#unsorted').DataTable({
        responsive: true,
        ajax: {
            url: '/api/list/unsorted.json',
            dataSrc: ''
        },
        order: [
            [1, "asc"]
        ],
        columns: [
            {
                className: 'columnControls',
                orderable: false,
                data: null,
                render: (data, type, row) => `<button class="cell view button btn btn-outline-dark" data-assetid="${row.assetId}" data-cid="${row.cid}" data-list="unsorted">View</button>`
            },
            {
                className: 'columnAssetId',
                data: 'assetId',
                render: (data, type, row) => `<button class="cell reject button btn btn-outline-danger" data-column="assetId" data-assetid="${row.assetId}" data-cid="${row.cid}">X</button>` + data
            },
            {
                className: 'columnCid',
                data: 'cid',
                render: (data, type, row) => `<button class="cell approve button btn btn-outline-success" data-column="cid" data-assetid="${row.assetId}" data-cid="${row.cid}">✓</button><button class="cell reject button btn btn-outline-danger" data-column="cid" data-assetid="${row.assetId}" data-cid="${row.cid}">X</button>` + data
            }
        ]
    }),
    approved: $('#approved').DataTable({
        responsive: true,
        ajax: {
            url: '/api/list/approved.json',
            dataSrc: ''
        },
        order: [
            [1, "asc"]
        ],
        columns: [
            {
                className: 'columnNarrowControls',
                orderable: false,
                data: null,
                render: (data, type, row) => `<button class="cell view button btn btn-outline-dark" data-assetid="${row.assetId}" data-cid="${row.cid}" data-list="approved">View</button>`
            },
            {className: 'columnAssetId', data: 'assetId'},
            {className: 'columnCid', data: 'cid'}
        ]
    })
};
let redraw=()=>{
    for (let list in dataTable) dataTable[list].ajax.reload(null,false);
}
setInterval(redraw,60000);

/*
██╗   ██╗██╗███████╗██╗    ██╗███████╗██████╗
██║   ██║██║██╔════╝██║    ██║██╔════╝██╔══██╗
██║   ██║██║█████╗  ██║ █╗ ██║█████╗  ██████╔╝
╚██╗ ██╔╝██║██╔══╝  ██║███╗██║██╔══╝  ██╔══██╗
 ╚████╔╝ ██║███████╗╚███╔███╔╝███████╗██║  ██║
  ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝ ╚══════╝╚═╝  ╚═╝
 */

/**
 * Shows a CID page
 * @param {{
 *      assetid:string,
 *      cid:string,
 *      list: "unsorted"|"approved"
 * }}    data
 */
const showView=(data)=>{
    try {
        const {assetid, cid, list} = data;
        $("#window_data").attr('src', api.cid.page(cid));
        $("#window_approve").data({assetid, cid, list, column: "cid"});
        $("#window_reject").data({assetid, cid, list, column: "cid"});
        $("#window_reject_all").data({assetid, cid, list, column: "assetId"});
        $("#window").show();
        $("#shadow").show();
    } catch (e) {
        showError(e);
    }
}

//handle view click event
$(document).on('click','.view',function(){
    showView($(this).data());
});

/*
 █████╗ ██████╗ ██████╗ ██████╗  ██████╗ ██╗   ██╗███████╗    ██████╗ ███████╗     ██╗███████╗ ██████╗████████╗
██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔═══██╗██║   ██║██╔════╝    ██╔══██╗██╔════╝     ██║██╔════╝██╔════╝╚══██╔══╝
███████║██████╔╝██████╔╝██████╔╝██║   ██║██║   ██║█████╗      ██████╔╝█████╗       ██║█████╗  ██║        ██║
██╔══██║██╔═══╝ ██╔═══╝ ██╔══██╗██║   ██║╚██╗ ██╔╝██╔══╝      ██╔══██╗██╔══╝  ██   ██║██╔══╝  ██║        ██║
██║  ██║██║     ██║     ██║  ██║╚██████╔╝ ╚████╔╝ ███████╗    ██║  ██║███████╗╚█████╔╝███████╗╚██████╗   ██║
╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝  ╚═╝ ╚═════╝   ╚═══╝  ╚══════╝    ╚═╝  ╚═╝╚══════╝ ╚════╝ ╚══════╝ ╚═════╝   ╚═╝
 */

/**
 *
 * @param {"approve"|"reject"}  type
 * @param {{
 *      assetid:string,
 *      cid:string,
 *      column:"assetId"|"cid",
 *      list: "unsorted"|"approved"
 * }}    data
 */
const processARclick=(type,data)=>{
    const {assetid,cid,column,list}=data;
    api[column][type](assetid,cid).then(()=>dataTable[type].ajax.reload(null,false));

    //see if there are more and open next value if there are
    let old=(column==="cid")?cid:assetid;
    let next="";
    if (list!=="") {
        try {
            for (let i=0;true;i++) {
                let line = dataTable[list].row(i).data();
                console.log(line);
                if (line[column] !== old) {
                    next = line;
                    break;
                }
            }
        } catch (e) {

        }
    }

    if (next==="") {
        //close if no more left
        $("#window").hide();
        $("#shadow").hide();
    } else {
        //open next if there are
        showView({
            assetid:    next.assetId,
            cid:        next.cid,
            list
        });
    }

}

//handle approve click event
$(document).on('click','.approve',function(){
    processARclick("approve",$(this).data());
});

//handle reject click event
$(document).on('click','.reject',function(){
    processARclick("reject",$(this).data());
});

//handle close click event
$(document).on('click','.close',function(){
    $("#window").hide();
    $("#shadow").hide();
    $("#window_data").attr('src','/blank.html');
});


/*
███████╗██╗   ██╗██████╗ ███████╗ ██████╗██████╗ ██╗██████╗ ████████╗██╗ ██████╗ ███╗   ██╗███████╗
██╔════╝██║   ██║██╔══██╗██╔════╝██╔════╝██╔══██╗██║██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
███████╗██║   ██║██████╔╝███████╗██║     ██████╔╝██║██████╔╝   ██║   ██║██║   ██║██╔██╗ ██║███████╗
╚════██║██║   ██║██╔══██╗╚════██║██║     ██╔══██╗██║██╔═══╝    ██║   ██║██║   ██║██║╚██╗██║╚════██║
███████║╚██████╔╝██████╔╝███████║╚██████╗██║  ██║██║██║        ██║   ██║╚██████╔╝██║ ╚████║███████║
╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝╚═╝        ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
 */
$(document).on('click','.subscription_add',function (){
    //get inputs
    let type=$(this).data("type");  //approved,rejected,both
    let url=$('#subscription_new').val().trim();

    //check its a valid url by trying to download lists
    //todo
});


/*
██╗    ██╗ █████╗ ██╗     ██╗     ███████╗████████╗
██║    ██║██╔══██╗██║     ██║     ██╔════╝╚══██╔══╝
██║ █╗ ██║███████║██║     ██║     █████╗     ██║
██║███╗██║██╔══██║██║     ██║     ██╔══╝     ██║
╚███╔███╔╝██║  ██║███████╗███████╗███████╗   ██║
 ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝
 */
let walletTable={active:""};
/**
 * Shows wallet data.  If not already started then initializes it
 * @param {"assets"|"assetsbylabel"}    type
 */
const startWallet=(type)=>{
    $(".wallet").hide();
    $("#wallet_div_"+type).show();
    walletTable.active=type;
    if (walletTable[type]!==undefined) return;
    let columns=[
        {
            className: 'columnWalletAssetId',
            data: null,
            render: (data,type,row)=>{
                if (row.cid===undefined) return row.assetId;
                return row.assetId+':'+row.cid;
            }
        },
        {
            className: 'columnWalletBalance',
            data: null,
            render: (data,type,row)=>satToDecimal(row.value,row.decimals)
        },
        {
            className: 'columnSend',
            data: null,
            render: (data, type, row) => {
                let button='<button class="cell button btn send_asset"';
                for (let index in row) {
                    button+=` data-${index.toLowerCase()}="${row[index].toString()}"`;
                }
                button+=`>Send</button>`;
                return button;
            }
        }
    ];
    if (type==="assetsbylabel") columns.unshift({
        className: 'columnWalletLabel',
        data: 'label'
    });
    walletTable[type]=$('#wallet_list_'+type).DataTable({
        processing: true,
        responsive: true,
        language: {
            loadingRecords: '&nbsp;',
            processing: '<div class="spinner"></div>'
        },
        ajax: {
            url: '/api/wallet/'+type+'.json',
            dataSrc: ''
        },
        order: [
            [0, "asc"]
        ],
        columns
    });
}

//handles the split by label switch
$(document).on('click','#wallet_split_by_label',()=>{
    if ($("#wallet_split_by_label").is(':checked')) {
        startWallet("assetsbylabel");
    } else {
        startWallet("assets");
    }
})

//handles the wallet refresh button
$(document).on('click','#wallet_refresh',()=>{
    walletTable[walletTable.active].ajax.reload(null,false);
});

//sending cost data table
let send_assets_cost=$("#send_assets_costs").DataTable({
    responsive: true,
    processing: true,
    language: {
        loadingRecords: '&nbsp;',
        processing: '<div class="spinner"></div>'
    },
    columns: [
        {
            data: 'type',
        },
        {
            data: 'amount'
        }
    ]
});

/**
 * triggered by addresses table this function redraws the table costs and enables/disables send button
 * @return {Promise<void>}
 */
let assetCostsWaiting=0;
const redrawAssetCosts=async()=>{
    try {
        let rowCount=send_assets_addresses.data().count();
        if (rowCount === 0) {
            send_assets_cost.clear().draw();
        } else {
            $("#send_asset_send").attr('disabled',true);
            send_assets_cost.processing(true);                      //show processing
            let sending=send_assets_addresses.assetData;
            let recipients=[];
            for (let i=0;i<rowCount;i++) recipients.push(send_assets_addresses.row(i).data());
            assetCostsWaiting++;
            let {costs, hex} = await api.wallet.build.assetTx(sending,recipients);   //get updated cost
            assetCostsWaiting--;
            send_assets_cost.clear().rows.add(costs).draw();        //update table
            $("#send_asset_send").data("tx",hex);                   //put unsigned tx in send buttons data
            if (assetCostsWaiting===0) {
                send_assets_cost.processing(false);                     //remove processing
                $("#send_asset_send").removeAttr('disabled');     //reenable send button
            }
        }
    } catch (e) {
        //error always called on first execution so ignore
        console.log(e);
    }
}

//sending address data table
let send_assets_addresses=$('#send_assets_addresses').DataTable({
    responsive: true,
    order: [
        [1, "asc"]
    ],
    columns: [
        {
            className: "dt-center send_assets_addresses-delete",
            data: null,
            defaultContent: '<i class="fa fa-trash"/>', //todo not showing needs fixing
            orderable: false
        },
        {
            className: 'columnAddress',
            data: null,
            render: (data,type,row)=>(row.address!==undefined)?row.address:`${row.assetId}(${row.amount} per ${row.type} at height ${row.height})`
        },
        {
            className: 'columnQuantity',
            data: 'quantity'
        }
    ],
    drawCallback: redrawAssetCosts
});

//opens pop up when send asset button is clicked
$(document).on('click','.send_asset',function() {
    /** @type {{label,assetid,cid,value,decimals}} */let data=$(this).data();
    $("#SAMLabel").text("Send "+data.assetid+(data.cid==undefined?"":`:${data.cid}`));
    send_assets_addresses.assetData=data;
    send_assets_addresses.clear();
    $('#send_assets_costs > tbody').html("");




    (new bootstrap.Modal(document.getElementById('SendAssetsModal'))).show();
});

//show/hide send asset types
$(document).on('keyup','#send_assets_new_address',()=>{
    let type = $("#send_assets_new_address").val().trim().substr(0,1);
    $(".send_asset_assetId")[(type==="L")||(type==="U")?"show":"hide"]();
});

//handle removing item from table
$('#send_assets_addresses tbody').on( 'click', 'td.send_assets_addresses-delete', function (e) {
    e.preventDefault();
    send_assets_addresses.row( $(this).parents('tr') ).remove().draw();
} );

//add address to sending table
$(document).on('click','#send_assets_new',async()=>{
    try {
        let decimals=send_assets_addresses.assetData.decimals;
        let assetsPerHolder = $("#send_asset_assetId_type_holder").prop("checked");
        let address = $("#send_assets_new_address").val().trim();
        let quantity = Math.round(parseFloat($("#send_assets_new_quantity").val().trim())*Math.pow(10,decimals));
        let data = {address, quantity: satToDecimal(quantity,decimals)};
        if ((address[0] === "L") || (address[0] === "U")) {
            //lookup height and asset
            let height = api.stream("height");
            let assetData = api.stream(address);
            await Promise.all([height, assetData]);

            //get total assets
            let total=0;
            let {holders}=await assetData;
            for (let index in holders) {
                total+=assetsPerHolder?quantity:parseInt(holders[index])*quantity;
            }

            //update data
            data = {
                assetId: address,                                   //value in address variable actually an assetId
                type: assetsPerHolder ? "holder" : "asset",
                height: await height,
                amount: satToDecimal(quantity,decimals),                 //store the per holder value as amount
                quantity: satToDecimal(total,decimals)                   //store total as quantity
            };

        }
        send_assets_addresses.row.add(data).draw();

        //recompute costs

    } catch (e) {
        console.log(e);
        showError("Invalid AssetId");   //errors only thrown when assetId is invalid
    }
});

//todo .sendTx will have data("tx") containing hex transaction.  should ask for wallet password then do apii.wallet.send

/*
██╗   ██╗██████╗  ██████╗ ██████╗  █████╗ ██████╗ ███████╗
██║   ██║██╔══██╗██╔════╝ ██╔══██╗██╔══██╗██╔══██╗██╔════╝
██║   ██║██████╔╝██║  ███╗██████╔╝███████║██║  ██║█████╗
██║   ██║██╔═══╝ ██║   ██║██╔══██╗██╔══██║██║  ██║██╔══╝
╚██████╔╝██║     ╚██████╔╝██║  ██║██║  ██║██████╔╝███████╗
 ╚═════╝ ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝
 */

//handle upgrade
$(document).on('click','#updateBtn',async()=>{
    let state=await api.version.update();
    if (state===true) {
        location.reload();
    } else {
        showError(state["error"]);
    }
});

//check if newest
const isNewest=async()=>{
    let {compatible,newer,current}=await api.version.list();
    let newestAvailable=compatible.pop();
    //todo we should do something with newer.  if newer!==undefined then there is new binaries they can download from git hub
    if (newestAvailable===current) {
        $("#updateBtn").hide();  //we have updated
    } else {
        $("#updateBtn").text(`Update Available (Version: ${newestAvailable})`).show();
    }
}
// noinspection JSIgnoredPromiseFromCall
isNewest();//check at start
setInterval(isNewest,86400000);//recheck daily

/*
██╗      ██████╗  ██████╗ ██╗███╗   ██╗
██║     ██╔═══██╗██╔════╝ ██║████╗  ██║
██║     ██║   ██║██║  ███╗██║██╔██╗ ██║
██║     ██║   ██║██║   ██║██║██║╚██╗██║
███████╗╚██████╔╝╚██████╔╝██║██║ ╚████║
╚══════╝ ╚═════╝  ╚═════╝ ╚═╝╚═╝  ╚═══╝
 */

//check if logged in
const showLoginBox=()=>(new bootstrap.Modal(document.getElementById('LoginModal'))).show();
const walletConfigured=()=>{
    $('#menu_wallet').append("✓");
    $('.needwallet').removeAttr('disabled');
}
const streamConfigured=()=>{
    $('#menu_stream').append("✓");
    $('.needstream').removeAttr('disabled');
}
const bothConfigured=()=>{
    $('.needwalletandstream').removeAttr('disabled');
    startWallet("assets");
}
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
        $('#config_values').html(generateRandomConfig());     //generate random config for instructions
        startDataTable();                                     //start cid list

        //check if wallet configured
        let walletGood=false;
        api.wallet.blockHeight().then(()=>{
            walletGood=true;
            walletConfigured();
            if (streamGood) bothConfigured();
        },()=>{});

        //check if stream configured
        let streamGood=false;
        api.stream("height").then(()=>{
            streamGood=true;
            streamConfigured();
            if (walletGood) bothConfigured();
        },()=>{});

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

/*
██╗      ██████╗  ██████╗  ██████╗ ██╗   ██╗████████╗
██║     ██╔═══██╗██╔════╝ ██╔═══██╗██║   ██║╚══██╔══╝
██║     ██║   ██║██║  ███╗██║   ██║██║   ██║   ██║
██║     ██║   ██║██║   ██║██║   ██║██║   ██║   ██║
███████╗╚██████╔╝╚██████╔╝╚██████╔╝╚██████╔╝   ██║
╚══════╝ ╚═════╝  ╚═════╝  ╚═════╝  ╚═════╝    ╚═╝
 */
//handle logout request
$(document).on('click','#menu_logout',async()=>{
    await api.user.logout();
    location.reload();
});

/*
██████╗  █████╗  ██████╗ ███████╗███████╗
██╔══██╗██╔══██╗██╔════╝ ██╔════╝██╔════╝
██████╔╝███████║██║  ███╗█████╗  ███████╗
██╔═══╝ ██╔══██║██║   ██║██╔══╝  ╚════██║
██║     ██║  ██║╚██████╔╝███████╗███████║
╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚══════╝
 */
$(document).on('click','.nav_page',function(){
    let page=$(this).data("page");
    if ($(this).attr('disabled')==='disabled') {
        showError($(this).data("tooltip"));
    } else {
        $(".page").hide();
        $("#" + page).show();
    }
});

/*
 ██████╗ ██████╗ ███╗   ██╗███████╗██╗ ██████╗
██╔════╝██╔═══██╗████╗  ██║██╔════╝██║██╔════╝
██║     ██║   ██║██╔██╗ ██║█████╗  ██║██║  ███╗
██║     ██║   ██║██║╚██╗██║██╔══╝  ██║██║   ██║
╚██████╗╚██████╔╝██║ ╚████║██║     ██║╚██████╔╝
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝     ╚═╝ ╚═════╝
 */

/*  _      _    _   _   _
   /_\  __| |__| | | | | |___ ___ _ _
  / _ \/ _` / _` | | |_| (_-</ -_) '_|
 /_/ \_\__,_\__,_|  \___//__/\___|_|
 */
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

/*___                         _   _
 | _ \___ _ __  _____ _____  | | | |___ ___ _ _
 |   / -_) '  \/ _ \ V / -_) | |_| (_-</ -_) '_|
 |_|_\___|_|_|_\___/\_/\___|  \___//__/\___|_|
 */
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

/*_      __    _ _     _
 \ \    / /_ _| | |___| |_
  \ \/\/ / _` | | / -_)  _|
   \_/\_/\__,_|_|_\___|\__|
 */
$(document).on('click','#menu_wallet',async()=>{
    (new bootstrap.Modal(document.getElementById('WalletModal'))).show();
});
const generateRandomConfig=()=>{
    let randomUser="";
    let randomPassword="";
    for (let i=0;i<10;i++) {
        randomUser+=String.fromCharCode(65+Math.floor(Math.random()*26)+32*Math.floor(Math.random()*2));//Pick random upper or lower case letter
        randomPassword+=String.fromCharCode(65+Math.floor(Math.random()*26)+32*Math.floor(Math.random()*2));//Pick random upper or lower case letter
        randomPassword+=String.fromCharCode(65+Math.floor(Math.random()*26)+32*Math.floor(Math.random()*2));//Pick random upper or lower case letter
    }
    return `rpcuser=${randomUser}<br>rpcpassword=${randomPassword}<br>rpcbind=127.0.0.1<br>rpcport=14022<br>whitelist=127.0.0.1<br>rpcallowip=127.0.0.1`;
}
$(document).on('click','#wallet_auto',async()=>{
    let result=await api.config.wallet.auto();
    if (result===true) {
        //todo some kind of better success screen
        location.reload();
    } else if (result===false) {
        showError("Could not find wallets config file");
    } else {
        showError('Found a wallet config file at ${result} but it was not configured correctly.<br><br>Please add<br>'+generateRandomConfig());
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

/*___ _
 / __| |_ _ _ ___ __ _ _ __
 \__ \  _| '_/ -_) _` | '  \
 |___/\__|_| \___\__,_|_|_|_|
 */
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
        showError(e);}
});

/*__  __        _ _
 |  \/  |___ __| (_)__ _
 | |\/| / -_) _` | / _` |
 |_|  |_\___\__,_|_\__,_|
 */
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