// noinspection JSUnfilteredForInLoop,JSJQueryEfficiency

const fileCostPerByte=0.0000012;    //$1.20/MB

let getHeight=async()=>{
    let height=await api.height();
    $("#last_block").html("<strong>Last Block Scanned</strong> : "+height);
    let dailyStats = await api.digiassetX.payout.daily();
    let sats=dailyStats.padStart(9,'0');
    let i=sats.length-8;
    let dgb=sats.substr(0,i)+"."+sats.substr(i);
    $("#daily_total_reward").html("Daily Payout : ~"+dgb+" DGB");
}

/**
 * Shows an error message pop up
 * @param {string}  e
 */
const showError=(e)=>{
    $("#error_message").text(e);
    (new bootstrap.Modal(document.getElementById('ErrorModal'))).show();
}

/**
 * Sleeps processing for a time
 * @param {int} ms
 * @return {Promise<void>}
 */
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

/**
 * Base58 Decoder
 * @param {string}  S
 * @return {Uint8Array}
 */
const from_b58 = function(S){const A="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";let d=[],b=[],i,j,c,n;for(i in S){j=0,c=A.indexOf(S[i]);if(c<0)return undefined;c||b.length^i?i:b.push(0);while(j in d||c){n=d[j];n=n?n*58+c:c;c=n>>8;d[j]=n%256;j++}}while(j--)b.push(d[j]);return new Uint8Array(b)};

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
████████╗ ██████╗ ███████╗
╚══██╔══╝██╔═══██╗██╔════╝
   ██║   ██║   ██║███████╗
   ██║   ██║   ██║╚════██║
   ██║   ╚██████╔╝███████║
   ╚═╝    ╚═════╝ ╚══════╝
 */
let tosModal=new bootstrap.Modal(document.getElementById('tosModal'),{
    backdrop:   "static",
    keyboard:   false
});
let tosResolve;

/**
 * Shows the TOS and returns a promise until the user accepts it
 * @param {boolean} onceOnly
 * @return {Promise<void>}
 */
const showTOS=(onceOnly=true)=>new Promise(resolve=>{
    api.config.optIn.get().then(({showOnMap,publishPeerId,payout})=>{
        $('#tosShow').prop('checked', showOnMap);
        $('#tosPeer').prop('checked', publishPeerId);
        $("#tosPayout").val(payout);
    });

    api.tos.get().then(({agreed, tos, hash}) => {
        if (onceOnly&&agreed) return resolve();
        tosResolve=resolve;
        $("#tosLegal").html(tos);
        $("#tosAgree").data("hash", hash);
        tosModal.show();
    });
});

$(document).on('click','#menu_tos',()=>showTOS(false));

$(document).on('click',"#tosAgree",async ()=>{
    //check if they opted in to some features
    let showOnMap=$("#tosShow").is(':checked');
    let publishPeerId=$("#tosPeer").is(':checked');
    let payout=$("#tosPayout").val().trim();
    if (payout!=="") {
        if (!await api.digibyte.checkAddress(payout)) {
            showError("Invalid Payout address");
            return;
        }
        if (!showOnMap) {
            showError("To get paid you must agree to display your node");
            return;
        }
        if (!publishPeerId) {
            showError("To get paid you must agree to publish your Peer Id");
            return;
        }
    }
    api.config.optIn.set(showOnMap,publishPeerId,payout);

    //mark tos as agreed
    const hash=$("#tosAgree").data("hash");
    api.tos.set(hash);
    tosModal.hide();
    if (tosResolve!==undefined) {
        tosResolve();
        tosResolve=undefined;
    }
});

/*
███╗   ███╗███████╗████████╗ █████╗     ██████╗  █████╗ ████████╗ █████╗     ██╗     ██╗███████╗████████╗███████╗
████╗ ████║██╔════╝╚══██╔══╝██╔══██╗    ██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗    ██║     ██║██╔════╝╚══██╔══╝██╔════╝
██╔████╔██║█████╗     ██║   ███████║    ██║  ██║███████║   ██║   ███████║    ██║     ██║███████╗   ██║   ███████╗
██║╚██╔╝██║██╔══╝     ██║   ██╔══██║    ██║  ██║██╔══██║   ██║   ██╔══██║    ██║     ██║╚════██║   ██║   ╚════██║
██║ ╚═╝ ██║███████╗   ██║   ██║  ██║    ██████╔╝██║  ██║   ██║   ██║  ██║    ███████╗██║███████║   ██║   ███████║
╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝    ╚══════╝╚═╝╚══════╝   ╚═╝   ╚══════╝
 */
let verified={};
updateVerified=async()=>{
    try {
        verified = await api.digiassetX.ipfs.verified();
        for (let list in dataTable) dataTable[list].draw();
    } catch (e) {}
}

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
                className: 'columnApproved clickable',
                data: 'approved',
                render: (data) => (data===true)?"✓":""
            },
            {
                className: 'columnRejected clickable',
                data: 'rejected',
                render: (data) => (data===true)?"X":""
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
                render: (data, type, row) => `<button class="cell view button btn btn-outline-dark" data-assetid="${row.assetId}" data-cid="${row.cid}" data-list="unsorted">View</button>${(row.permanent===true)?'<span class="hidden">*</span>':""}`
            },
            {
                className: 'columnAssetId',
                data: 'assetId',
                render: (data, type, row) => `<button class="cell reject button btn btn-outline-danger" data-column="assetId" data-assetid="${row.assetId}" data-cid="${row.cid}">X</button>${(row.permanent===true)?"<b>":""}${data}${(row.permanent===true)?"</b>":""}${(verified[data]!==undefined)?' <img class="smallVerified" src="/images/verified.jpg">':''}`
            },
            {
                className: 'columnCid',
                data: 'cid',
                render: (data, type, row) => `<button class="cell approve button btn btn-outline-success" data-column="cid" data-assetid="${row.assetId}" data-cid="${row.cid}">✓</button><button class="cell reject button btn btn-outline-danger" data-column="cid" data-assetid="${row.assetId}" data-cid="${row.cid}">X</button>${(row.permanent===true)?"<b>":""}${data}${(row.permanent===true)?"</b>":""}`
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
            {
                className: 'columnAssetId',
                data: 'assetId',
                render: (data, type, row) => `${(row.permanent===true)?"<b>":""}${data}${(row.permanent===true)?"</b>":""}${(verified[data]!==undefined)?' <img class="smallVerified" src="/images/verified.jpg">':''}`
            },
            {
                className: 'columnCid',
                data: 'cid',
                render: (data, type, row) => `${(row.permanent===true)?"<b>":""}${data}${(row.permanent===true)?"</b>":""}`
            }
        ]
    })
};
let redraw=()=>{
    for (let list in dataTable) dataTable[list].ajax.reload(null,false);
}

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
    const {assetid, cid, list} = data;
    try {
        $("#window_data").attr('src', api.cid.page(cid));
        $("#window_data").data('assetid', assetid);
        $("#window_approve").data({assetid, cid, list, column: "cid"});
        $("#window_reject").data({assetid, cid, list, column: "cid"});
        $("#window_reject_all").data({assetid, cid, list, column: "assetId"});
        $("#window").show();
        $("#shadow").show();
    } catch (e) {
        showError(e);
    }
}
$("#window_data").on('load',async()=>{
    let assetId=$("#window_data").data('assetid');
    let pre=$("#window_data").contents().find('#pre');
    let post=$("#window_data").contents().find('#post');
    if (pre.length>0) {
        try {
            let chainData = await api.stream.get(assetId);
            let postHtml='<h1>Chain Data:</h1><div class="json">'+JSON.stringify(chainData, null, 4)+'</div>';
            post.html(postHtml);
            let preHtml='<h1>Verified Asset:</h1>';
            if (chainData.kyc===undefined) {
                preHtml += "Unverified";
            } else if (chainData.kyc.name!==undefined) {
                preHtml += '<img src="/images/verified.jpg"><br>created by '+chainData.kyc.name;
            } else {
                preHtml += '<img src="/images/verified.jpg"><br>created by Anonymous in '+chainData.kyc.country;
            }
            pre.html(preHtml);
        } catch (e) {

        }
    }
});

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
    api[column][type](assetid,cid).then(()=>dataTable[list].ajax.reload(null, false));

    //see if there are more and open next value if there are
    let old=(column==="cid")?cid:assetid;
    let next="";
    if (list!=="") {
        try {
            for (let i=0;true;i++) {
                let line = dataTable[list].row(i).data();
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
    $("#window_metadata").attr('src','/blank.html');
    $("#window_chaindata").html("");
});


/*
███████╗██╗   ██╗██████╗ ███████╗ ██████╗██████╗ ██╗██████╗ ████████╗██╗ ██████╗ ███╗   ██╗███████╗
██╔════╝██║   ██║██╔══██╗██╔════╝██╔════╝██╔══██╗██║██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
███████╗██║   ██║██████╔╝███████╗██║     ██████╔╝██║██████╔╝   ██║   ██║██║   ██║██╔██╗ ██║███████╗
╚════██║██║   ██║██╔══██╗╚════██║██║     ██╔══██╗██║██╔═══╝    ██║   ██║██║   ██║██║╚██╗██║╚════██║
███████║╚██████╔╝██████╔╝███████║╚██████╗██║  ██║██║██║        ██║   ██║╚██████╔╝██║ ╚████║███████║
╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝╚═╝        ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
 */
$(document).on('click','.subscription_add',async function (){
    //get inputs
    let type=$(this).data("type");  //approved,rejected,both
    let url=$('#subscription_new').val().trim();

    //check its a valid url by trying to download lists
    try {
        await api.config.subscription.add(url, (type !== "rejected"), (type !== "approved"));
        dataTable.subscription.ajax.reload();
    } catch (e) {
        showError(e);
    }
});

$(document).on('click',".columnApproved",function() {
    let row=dataTable.subscription.row( $(this).parents('tr') );
    let data=row.data();
    data.approved=!data.approved;
    api.config.subscription.approved(data.url,data.approved);
    row.data(data).draw();
});
$(document).on('click',".columnRejected",function() {
    let row=dataTable.subscription.row( $(this).parents('tr') );
    let data=row.data();
    data.rejected=!data.rejected;
    api.config.subscription.rejected(data.url,data.rejected);
    row.data(data).draw();
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
 * Creates a button for sending assets
 * @param {{
 *      label:  string,
 *      assetId:  string,
 *      value:  string,
 *      decimals: int,
 *      cid: string,
 *      metadata: Object,
 *      data: {
 *          rules:  ?AssetRules
 *          kyc:    ?KycState,
 *          issuer: string,
 *          divisibility: int,
 *          metadata: {
 *              txid:    string,
 *              cid:     string
 *          }[]
 *      }
 * }} row
 * @param {string}  label
 * @param {"vote_asset"|"send_asset"|"visit_site"}  triggerClass
 */
const createAssetSendButton=(row,label,triggerClass)=>{
    let html=`<button class="cell button btn ${triggerClass}"`;
    for (let index in row) {
        if (index==="data") continue;  //skip data
        html+=` data-${index.toLowerCase()}="${row[index].toString()}"`;
    }
    if (triggerClass==="vote_asset") html+=` data-options='${JSON.stringify(row.data.rules.vote.options)}'`;
    if (triggerClass==="visit_site") html+=` data-site='${JSON.stringify(row.metadata.data.site)}'`;
    html+=`>${label}</button>`;
    return html;
}


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
            className: 'columnWalletIcon',
            data: null,
            render: (data,type,row)=>{
                let cidToUse=row.cid;
                if ((cidToUse===undefined)&&(row.data.metadata!==undefined)) cidToUse=(row.data.metadata.pop()||{}).cid;
                row.data.cidToUse=cidToUse;
                return `<img width="50px" height="50px" src="/api/cors/icon/${row.data.cidToUse}">`;
            }
        },
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
                let movable=true;
                let html='';
                if ((row.data.rules!==undefined)&&(row.data.rules.vote!==undefined)) {
                    if (row.data.rules.vote.options.length>0) html+=createAssetSendButton(row,'Vote','vote_asset');
                    movable=row.data.rules.vote.movable;
                }
                if (movable) html+=createAssetSendButton(row,'Send','send_asset');
                if ((row.metadata!==undefined)&&(row.metadata.data.site!==undefined)) html+=createAssetSendButton(row,'Visit','visit_site');
                if (row.data.cidToUse!==undefined) html+=`<button class="view button btn btn-outline-dark" data-assetid="${row.assetId}" data-cid="${row.data.cidToUse}" data-list="unsorted">View</button>`;
                return html;
            }
        }
    ];
    if (type==="assetsbylabel") {
        // noinspection JSCheckFunctionSignatures
        columns.unshift({
                className: 'columnWalletLabel',
                data: 'label'
            });
    }
    walletTable[type]=$('#wallet_list_'+type).DataTable({
        processing: true,
        responsive: true,
        language: {
            loadingRecords: '&nbsp;',
            processing: '<div class="spinner"></div>'
        },
        ajax: {
            url: '/api/wallet/asset/list.json',
            dataSrc:'',
            data: {byLabel:(type==="assetsbylabel")}
        },
        order: [
            [1, "asc"]
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
$("#send_assets_costs").DataTable({
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

//vote cost data table
$("#vote_assets_costs").DataTable({
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

let assetCostsWaiting={};   //0=none running, 1=1 running no need to run again,2= run again on end

/**
 * triggered by addresses table this function redraws the table costs and enables/disables send button
 * @return {Promise<void>}
 */
async function redrawAssetCosts() {
    let caller=this.api();
    const {expense,send,assetid,label,vote}=caller.tables().nodes().to$().data();

    if (assetCostsWaiting[expense]===undefined) assetCostsWaiting[expense]=0;
    if (assetCostsWaiting[expense]===2) return; //already 1 pending
    assetCostsWaiting[expense]++;
    if (assetCostsWaiting[expense]===2) return; //will run on complet

    let expenseTable=$("#"+expense).DataTable();
    let domAssetSend = $("#"+send);
    domAssetSend.attr('disabled', true);
    let assetTx;
    while (assetCostsWaiting[expense]>0) {
        assetTx={hex:"",costs:[],change:[]};
        try {
            let rowCount = caller.data().count();
            if (rowCount >0) {
                expenseTable.processing(true);                      //show processing
                let recipients = {};
                for (let i = 0; i < rowCount; i++) {
                    let list = caller.row(i).data().recipients;
                    for (let {address, quantity} of list) {
                        if (recipients[address] === undefined) recipients[address] = 0;
                        recipients[address] += quantity;
                    }
                }
                assetTx = await api.wallet.build.assetTx(recipients, assetid, label, vote);   //get updated cost
            }
        } catch (e) {
            //error always called on first execution so ignore
        }
        expenseTable.clear().rows.add(assetTx.costs).draw();
        assetCostsWaiting[expense]--;
    }
    expenseTable.processing(false);                     //remove processing
    domAssetSend.data({
        tx:     assetTx.hex,
        change: assetTx.change,
        label
    });
    if (assetTx.hex === "") {
        domAssetSend.attr('disabled', true);
    } else {
        domAssetSend.removeAttr('disabled');
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

//sending address data table
let vote_assets_options=$('#vote_assets_options').DataTable({
    responsive: true,
    ordering: false,
    columns: [
        {
            data:   'label',
            orderable: false
        },
        {
            data: null,
            render: (data,type,row)=>{
                if (row.left===true) return vote_assets_options.votesLeft;
                //todo would be nice if - was left aligned and + right aligned with text centered
                return `<button class="vote_assets_neg"${row.count>0?"":" disabled"}>-</button>${row.count}<button class="vote_assets_pos"${vote_assets_options.votesLeft>0?"":" disabled"}>+</button>`
            },
            orderable: false
        }
    ],
    drawCallback: redrawAssetCosts
});


const changeVoteValue=(direction,me)=>{
    vote_assets_options.votesLeft-=direction;

    //update rows
    let row=vote_assets_options.row( me.parents('tr') );
    let data=row.data();
    data.count+=direction;
    if ((data.count>0)&&(data.recipients.length===0)) data.recipients=[{address: data.address}];
    data.recipients[0].quantity=data.count;
    if (data.count===0) data.recipients=[];
    row.data(data);

    //handle change
    let lastIndex=vote_assets_options.rows().count()-1;
    let last=vote_assets_options.row(lastIndex);
    last.data({left:true,label:"Remaining",count:vote_assets_options.votesLeft,recipients:[]});

    //enable/disable + if any left
    if (vote_assets_options.votesLeft===0) {
        $(".vote_assets_pos").attr('disabled',true);
    } else {
        $(".vote_assets_pos").removeAttr('disabled');
    }

    //redraw table
    vote_assets_options.draw(false);
}

//handle adding removing votes
$(document).on('click','.vote_assets_neg',function(e) {
    e.preventDefault();
    changeVoteValue(-1,$(this));
});
$(document).on('click','.vote_assets_pos',function(e) {
    e.preventDefault();
    changeVoteValue(1,$(this));
});

//load site
$(document).on('click','.visit_site',async function() {
    let {site}=$(this).data();
    if (site.type==="restricted") {
        //todo show spinner
        let {digiId,assetId,url}=await $.getJSON(site.url);
        let password=await getWalletPassword();
        let success=await api.wallet.digiId(digiId,assetId,password);
        //todo remove spinner
        if (success) {
            window.open(url, "_blank");
        } else {
            showError("Failed to login");
        }
    } else {
        //open site in tab
        window.open(site.url,"_blank");
    }
});

//draw vote pop up
$(document).on('click','.vote_asset',function() {
    //add necessary data to table
    /** @type {{label,assetid,cid,value,decimals,receiver,options,expense,send,vote}} */let data=$(this).data();
    data.expense="vote_assets_costs";
    data.send="vote_asset_send";
    data.vote=true;
    $("#vote_assets_options").data(data);

    //initialize table data
    vote_assets_options.votesLeft=parseInt(data.value);
    for (let option of data.options) {
        option.count=0;
        option.recipients=[];
    }
    data.options.push({left:true,label:"Remaining",count:vote_assets_options.votesLeft,recipients:[]});
    vote_assets_options.clear().rows.add(data.options).draw();

    //clear costs
    $('#vote_assets_costs > tbody').html("");

    //show pop up
    (new bootstrap.Modal(document.getElementById('VoteAssetsModal'))).show();
});

//opens pop up when send asset button is clicked
$(document).on('click','.send_asset',function() {
    //add necessary data to table
    /** @type {{label,assetid,cid,value,decimals,receiver}} */let data=$(this).data();
    data.expense="send_assets_costs";
    data.send="send_asset_send";
    data.vote=false;
    $("#send_assets_addresses").data(data);

    //gather recipient info
    $("#SAMLabel").text("Send " + data.assetid + (data.cid == undefined ? "" : `:${data.cid}`));
    send_assets_addresses.clear().draw();

    //clear costs
    $('#send_assets_costs > tbody').html("");

    //show pop up
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
        let decimals=$("#send_assets_addresses").data("decimals");
        let assetsPerHolder = $("#send_asset_assetId_type_holder").prop("checked");
        let address = $("#send_assets_new_address").val().trim();
        let quantityStr=$("#send_assets_new_quantity").val().trim();
        let quantity = Math.round(parseFloat(quantityStr)*Math.pow(10,decimals));
        if ((quantity<=0)||(quantityStr==="")) {
            showError("Invalid Quantity");
            return;
        }
        let data = {address, quantity: satToDecimal(quantity,decimals),recipients:[{address,quantity}]};
        if ((address[0] === "L") || (address[0] === "U")) {
            //lookup height and asset
            let height = api.stream.get("height",false);
            let assetData = api.stream.get(address,false);
            await Promise.all([height, assetData]);

            //get total assets
            let total=0;
            let {holders}=await assetData;
            let recipients=[];
            for (let address in holders) {
                let quantityToAdd=assetsPerHolder?quantity:parseInt(holders[address])*quantity;
                total+=quantityToAdd;
                recipients.push({address,quantity:quantityToAdd})
            }

            //update data
            data = {
                assetId: address,                                   //value in address variable actually an assetId
                type: assetsPerHolder ? "holder" : "asset",
                height: await height,
                amount: satToDecimal(quantity,decimals),                 //store the per holder value as amount
                quantity: satToDecimal(total,decimals),                   //store total as quantity
                recipients                                               //list of those that will receive it
            };

        }
        send_assets_addresses.row.add(data).draw();

        //recompute costs
        $('#send_assets_new_address').val('');
        $('#send_assets_new_quantity').val('');
    } catch (e) {
        console.log(e);
        showError("Invalid AssetId");   //errors only thrown when assetId is invalid
    }
});

//handle sending transactions
$(document).on('click','.sendTX',async function(){
    let {tx,change,label}=$(this).data();
    let password=await getWalletPassword();
    try {
        let txid = await api.wallet.send(tx, password);
        for (let address of change) await api.wallet.change.markUsed(address,label);
        $("#txid").text(txid);
        //todo close other Modal that may be open
        (new bootstrap.Modal(document.getElementById('txidModal'))).show();
        await api.stream.clearCache(2+await api.wallet.blockHeight());
        console.log("show close now");
        //todo show close button on model box
    } catch (e) {
        showError(e);
    }
});

/**
 * Request the wallet password from user
 * @param {string}  text
 * @return {Promise<string>}
 */
const getWalletPassword=async(text="Wallet password is needed for this function.")=>{
    $("#walletpassword_message").text(text);
    let finished=false;
    let modal=new bootstrap.Modal(document.getElementById('WalletPasswordModal'));
    modal.show();
    try {
        await new Promise((resolve, reject) => {
            walletPasswordRR = [resolve, reject];

        });
        finished=true;
    } catch (_) {}
    modal.hide();
    if (!finished) throw "Transaction Canceled";
    return $("#walletpassword_pass").val().trim();
}
let walletPasswordRR=[()=>{},()=>{}];
$(document).on('click','#walletpassword_submit',()=>{
    walletPasswordRR[0]();
});
$(document).on('click','#walletpassword_close',()=>{
    walletPasswordRR[1]();
});

$(document).on('click','.newAddress',async function() {
    try {
        const {type} = $(this).data();
        const label = $("#wallet_new_label").val().trim();
        let address = await api.wallet.addresses.new(label, type);
        $("#new_address").text(address);
        let size = parseInt($("#new_address").data("size"));
        document.getElementById("new_address_qr").src = DigiQR.address(address, size, 2);
        (new bootstrap.Modal(document.getElementById('WalletNewAddressModal'))).show();
    } catch (e) {
        showError(e);
    }
});



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
    try {
        await api.version.update();
        location.reload();
    } catch (e) {
        showError(e);
    }
});

//check if newest
const isNewest=async()=>{
    try {
        let {compatible, newer, current} = await api.version.list();
        let newestAvailable = compatible.pop();
        if (newestAvailable===undefined) return;
        //todo we should do something with newer.  if newer!==undefined then there is new binaries they can download from git hub
        if (newestAvailable === current) {
            $("#updateBtn").hide();  //we have updated
        } else {
            $("#updateBtn").text(`Update Available (Version: ${newestAvailable})`).show();
        }
    } catch (e) {
    }
}

/*
██╗      ██████╗  ██████╗ ██╗███╗   ██╗
██║     ██╔═══██╗██╔════╝ ██║████╗  ██║
██║     ██║   ██║██║  ███╗██║██╔██╗ ██║
██║     ██║   ██║██║   ██║██║██║╚██╗██║
███████╗╚██████╔╝╚██████╔╝██║██║ ╚████║
╚══════╝ ╚═════╝  ╚═════╝ ╚═╝╚═╝  ╚═══╝
 */
const runOnceAfterLogin=async()=>{
    //show tos if not yet agreed
    await showTOS();

    //show IPFS scan height
    setInterval(getHeight,60000);
    // noinspection JSIgnoredPromiseFromCall
    getHeight();

    //check if template is up to date
    setInterval(isNewest,86400000);//recheck daily
    // noinspection JSIgnoredPromiseFromCall
    isNewest();//check at start

    //logged in or no login
    $("#menu_settings").removeAttr('disabled');     //enable settings
    let userList=await api.config.user.list();            //find out how many users there are
    if (userList.length>0) $("#menu_logout").show();      //actually logged in so show logout button
    let {html,user,pass}=generateRandomConfig();
    $('#config_values').html(html);     //generate random config for instructions
    $("#wallet_user").val(user);
    $("#wallet_pass").val(pass);

    //start cid list
    updateVerified().then(startDataTable);//start cid list
    setInterval(updateVerified,3600000);

    //more then 1 user so enable the remove user option
    if (userList.length>1) {
        $("#menu_remove_user").show();
        for (let user of userList) {
            $('#remove_user').append(new Option(user, user));
        }
    }

    //if wallet set up enable kyc and create asset options
    recheckWalletAndStream();
}


const recheckWalletAndStream=()=>{
    //check if wallet configured
    let walletGood=false;
    api.wallet.blockHeight().then(()=>{
        walletGood=true;
        walletConfigured();
        if (streamGood) bothConfigured();
    },()=>{});

    //check if stream configured
    let streamGood=false;
    api.stream.get("height").then(()=>{
        streamGood=true;
        streamConfigured();
        if (walletGood) bothConfigured();
    },()=>{});
}
window.recheckWalletAndStream=recheckWalletAndStream;

//check if logged in
const showLoginBox=()=>(new bootstrap.Modal(document.getElementById('LoginModal'))).show();
const walletConfigured=()=>{
    $('#menu_wallet').append("✓");
    $('.needWallet').removeAttr('disabled');
}
const streamConfigured=()=>{
    $('#menu_stream').append("✓");
    $('.needStream').removeAttr('disabled');
}
const bothConfigured=()=>{
    $('.needWalletAndStream').removeAttr('disabled');
    startWallet("assets");

    //start asset creator
    startAssetCreatorOptions();
}
$(document).ready(async()=>{
    let isLogedIn=await api.user.state();
    if (!isLogedIn) {
        //not logged in and needs to be
        showLoginBox();
        $("#menu_login").show();
    } else {
        runOnceAfterLogin();
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
        await api.config.user.add(user,pass);
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
    return {
        text:`listen=1\r\nserver=1\r\nrpcuser=${randomUser}\r\nrpcpassword=${randomPassword}\r\nrpcbind=127.0.0.1\r\nrpcport=14022\r\nwhitelist=127.0.0.1\r\nrpcallowip=127.0.0.1`,
        html:`listen=1\r\nserver=1\r\nrpcuser=${randomUser}<br>rpcpassword=${randomPassword}<br>rpcbind=127.0.0.1<br>rpcport=14022<br>whitelist=127.0.0.1<br>rpcallowip=127.0.0.1`,
        user:randomUser,
        pass:randomPassword
    };
}
$(document).on('click','#wallet_auto',async()=>{
    let result=await api.config.wallet.auto();
    if (result===true) {
        //todo some kind of better success screen
        location.reload();
    } else if (result===false) {
        showError("Could not find wallets config file");
    } else {
        showError('Found a wallet config file at ${result} but it was not configured correctly.<br><br>Please add<br>'+generateRandomConfig().html);
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
$(document).on('click','#clearCache',api.stream.clearCache);

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

/*___      _
 |   \ ___| |__ _  _ __ _
 | |) / -_) '_ \ || / _` |
 |___/\___|_.__/\_,_\__, |
                    |___/
 */
$(document).on('click','#menu_debug',async()=>{
    (new bootstrap.Modal(document.getElementById('DebugModal'))).show();
});
$(document).on('click','#debug_clear_cache',async()=>{
    await api.stream.clearCache();
    location.reload();
});
$(document).on('click','#debug_fix_labels',async()=>{
    await api.wallet.fix.labels();
    location.reload();
});


/*
██╗  ██╗██╗   ██╗ ██████╗
██║ ██╔╝╚██╗ ██╔╝██╔════╝
█████╔╝  ╚████╔╝ ██║
██╔═██╗   ╚██╔╝  ██║
██║  ██╗   ██║   ╚██████╗
╚═╝  ╚═╝   ╚═╝    ╚═════╝
 */

let kycAddresses;
const kycStart=()=>{
    if (kycAddresses!==undefined) {
        kycAddresses.ajax.reload(null,false);
        return;
    }
    kycAddresses=$('#kycAddresses').DataTable({
        responsive: true,
        ajax: {
            url: '/api/wallet/addresses/list.json',
            dataSrc: ''
        },
        order: [
            [1, "asc"]
        ],
        columns: [
            {
                data: 'address'
            },
            {
                data: 'label'
            },
            {
                className: 'balance',
                data: null,
                render: (data,type,row)=>satToDecimal(row.balance,8),
                defaultContent: 'Need Stream'
            },
            {
                data: 'null',
                render: (data, type, row) => (row.kyc===undefined)?"X":"✓"
            }
        ]
    });
    $('#kycAddresses tbody').on('click', 'tr', function () {
        $(this).toggleClass('selected');
        // noinspection JSIgnoredPromiseFromCall
        validateKYCInputs();
    });
}


//start button
$(document).on('click','#kycDone1',()=>{
    //show page
    $(".kycStep").hide();
    $("#kycStep2").show();

    //update address list
    kycStart();
});

const validateKYCInputs=async(submit)=>{
    let addresses = [];
    let options={type:$("#kycType").val()};
    try {
        //get address list
        let rows = kycAddresses.rows('.selected').data().toArray();
        if (rows.length===0) throw "No rows selected";
        for (let {address} of rows) addresses.push(address);

        //get options
        switch (options.type) {
            case "donate":
                options.label=$("#kycLabel").val().trim();
                options.goal=parseInt($("#kycGoal").val().trim());
                if (options.label.length<2) throw "Invalid Label Length";
                break;

            case "secret":
                options.pin=$("#kycPin").val().trim();
                if (options.pin.length<4) throw "Invalid Pin Length";
                break;

            case "voter":
                if (rows.length>1) throw "Only 1 address allowed";
        }

        $("#kycDone2").removeAttr('disabled');
    } catch (e) {
        $("#kycDone2").attr('disabled',true);
    }

    //submit if selected
    if (submit===true) {
        try {
            let password=await getWalletPassword();
            let url=await api.wallet.kyc(addresses,options,password);
            window.open(url);
        } catch (e) {
           showError(e)
        }
    }
}

//handle type selection
$(document).on('change',"#kycType",()=>{
    let type=$("#kycType").val();
    $(".for_donate")[type==="donate"?"show":"hide"]();
    $(".for_secret")[type==="secret"?"show":"hide"]();
});

//handle options change
$(document).on('keyup','.kyc_option',validateKYCInputs);

//handle validate click
$(document).on('click','#kycDone2',()=>{
    // noinspection JSIgnoredPromiseFromCall
    validateKYCInputs(true);
});


/*
 ██████╗██████╗ ███████╗ █████╗ ████████╗ ██████╗ ██████╗
██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗
██║     ██████╔╝█████╗  ███████║   ██║   ██║   ██║██████╔╝
██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██║   ██║██╔══██╗
╚██████╗██║  ██║███████╗██║  ██║   ██║   ╚██████╔╝██║  ██║
 ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
 */

/*___ _            _
 / __| |_ ___ _ __/ |
 \__ \  _/ -_) '_ \ |
 |___/\__\___| .__/_|
             |_|
Pick issuing address, lock/unlock state and if reissuing
 */
//reset buttons
$(document).on('click','.asset_creator_reset',()=>{
    assetCreatorAddresses.ajax.reload();
    $(".asset_creator_step").hide();
    $("#asset_creator_step1").show();
});

//create address table
let assetCreatorAddresses;
const startAssetCreatorOptions=()=> {
    assetCreatorAddresses=$("#asset_creator_addressOptions").DataTable({
        processing: true,
        responsive: true,
        language: {
            loadingRecords: '&nbsp;',
            processing: '<div class="spinner"></div>'
        },
        ajax: {
            url: '/api/wallet/asset/issuable.json',
            data: function (d) {
                d.kyc = ($("#asset_creator_useKyc").is(':checked'));
            },
            dataSrc: ''
        },
        order: [
            [1, "asc"]
        ],
        columns: [
            {
                data: 'null',
                render: (data, type, row) => {
                    //todo can we change Locked and unlocked to symbols of an open and closed lock
                    let availableDivisibility = 0x1ff;
                    let html = '';
                    for (let assetId of row.issuance) {
                        if (assetId.substr(0, 1) === "L") continue;
                        let divisibility = from_b58(assetId)[23];
                        availableDivisibility &= (0x1ff - Math.pow(2, divisibility));
                        html += `<button class="asset_creator_issue" data-type="reissue" data-address="${row.address}" data-assetid="${assetId}">Reissue ${assetId}</button>`;
                    }
                    return `<button class="asset_creator_issue" data-type="locked" data-address="${row.address}" data-divisibility="1ff">Locked</button><button class="asset_creator_issue" data-type="unlocked" data-address="${row.address}" data-divisibility="${availableDivisibility.toString(16)}">Unlocked</button>` + html;
                },
                orderable: false
            },
            {
                data: 'address'
            },
            {
                data: null,
                render: (data, type, row) => satToDecimal(row.value, 8)
            }
        ]
    });
}

//handle Verified check button click
$(document).on('click','#asset_creator_useKyc',()=>assetCreatorAddresses.ajax.reload());

//handle reissue click
let asset_creator_rule_disabled=false;
$(document).on('click','.asset_creator_issue',async function(){
    //get data
    const {type,address,assetid,divisibility}=$(this).data();
    /*
    type: "locked"|"unlocked","reissue"
    address: string
    assetid:string but only if type is "reissue"
     */

    //show/hide features not available to type
    let locked=(type==="locked");
    $(".asset_creator_unlockedOnly")[locked?"hide":"show"]();

    //save lock status and issuer
    $("#asset_creator_addresses").data({locked, address});

    //set fields to default(skip asset creator since likely always the same)
    $("#asset_creator_divisibility option").removeAttr('disabled');
    $("#asset_creator_aggregation option").removeAttr('disabled');
    $("#asset_creator_assetName").val("");
    $("#asset_creator_description").val("");
    $("#asset_creator_rulesEnabled").prop('checked',false);
    $("#asset_creator_rulesSettingBox").hide();
    $("#asset_creator_rewritable").prop('checked',false);
    $("#asset_creator_kyc option[value=false]").prop('selected', true);
    $("#asset_creator_kycList_div").hide();
    assetCreatorKYC.clear().rows.add(flags.countries()).draw();
    assetCreatorRoyalties.clear().draw();
    $("#asset_creator_deflate").val(0);
    $("#asset_creator_currency option[value=DGB]").prop('selected', true);
    $("#asset_creator_voteMovable").prop('checked',false);
    assetCreatorVoteOptions.clear().buttons().enable().draw();
    $(".asset_creator_voteInputs").removeAttr('disabled');
    $("#asset_creator_expiry").val(0).removeAttr('disabled');
    $("#asset_creator_site").val("");
    assetCreator_fileTable=[];
    $(".asset_creator_rule_input").attr('disabled',false);
    asset_creator_rule_disabled=false;

    //handle if reissuing
    if (type==="reissue") {
        //todo add spinner

        //get most recent data
        let {aggregation,divisibility,metadata,rules}=await api.wallet.asset.json(assetid);

        //set divisibility
        $("#asset_creator_divisibility option[value=" + divisibility + "]").prop('selected', true)
            .siblings().attr('disabled',true);

        //set aggregation
        console.log(aggregation);
        let agTypes=["aggregatable","hybrid","dispersed"];
        $("#asset_creator_aggregation option[value=" + agTypes[aggregation] + "]").prop('selected', true)
            .siblings().attr('disabled',true);

        //handle metadata
        let voteProcessed=false;
        if (metadata.data!==undefined) {
            const {data,votes}=metadata.data;
            if (data!==undefined) {
                const {assetName,issuer,description,urls,site}=data;
                if (assetName!==undefined) $("#asset_creator_assetName").val(assetName);
                if (issuer!==undefined) $("#asset_creator_assetIssuer").val(issuer);
                if (description!==undefined) $("#asset_creator_description").val(description);
                if (urls!==undefined) {
                    for (let {name,url,mimeType} of urls) {
                        let fileData;
                        if (url.substr(0,7)==="ipfs://") {
                            fileData=await createCidBlob(url.substr(7),name,mimeType);
                        } else {
                            let file=await api.cors(url,mimeType);
                            fileData=await createFileBlob(file,name,mimeType);
                        }
                        assetCreator_fileTable.push(fileData);
                    }
                    redrawFileTable();
                }
                if (site!==undefined) $("#asset_creator_site").val(site.url);
            }
            if (votes!==undefined) {
                assetCreatorVoteOptions.rows.add(votes).buttons().disable().draw();
                voteProcessed=true;
            }
        }

        //set rules
        if (rules!==undefined) {
            const {rewritable,signers,royalties,vote,kyc,currency,expires,deflate}=rules;
            $("#asset_creator_rulesEnabled").prop('checked',true);
            $("#asset_creator_rulesSettingBox").show();
            $("#asset_creator_rewritable").prop('checked',rewritable);

            if (!rewritable) {
                $(".asset_creator_rule_input").attr('disabled',true);
                asset_creator_rule_disabled=true;
            }

            if (signers!==undefined) {
                throw "requires PSBT"; //todo later requires core V8 for people to use so no real hurry
            }

            if (royalties!==undefined) {
                assetCreatorRoyalties.clear();
                for (let address in royalties) {
                    assetCreatorRoyalties.rows.add([{address,amount:royalties[address]}])
                }
                assetCreatorRoyalties.draw();
            }
            if (currency!==undefined) {
                $("#asset_creator_currency option[value="+currency.name+"]").prop('selected', true);
            }

            if (kyc!==undefined) {
                if (kyc===true) {
                    $("#asset_creator_kyc option[value=true]").prop('selected', true);
                } else {
                    //show if allow or ban
                    let allow=(kyc.allow!==undefined);
                    $("#asset_creator_kyc option[value="+(allow?"allow":"ban")+"]").prop('selected', true);
                    $("#asset_creator_kycList_div").show();

                    //select any countries that where selected
                    let list=kyc[allow?"allow":"ban"];
                    assetCreatorKYC.rows().every(function () {
                        let data = this.data();
                        let row = $(this.node());
                        if (list.indexOf(data.code)!==-1) row.toggleClass('selected');
                    });
                }
            }

            if (deflate!==undefined) {
                $("#asset_creator_deflate").val(deflate);
            }

            if (vote!==undefined) {
                if (!voteProcessed) throw "Could not recover vote options";
                if (vote.cutoff!==undefined) $("#asset_creator_expiry").val(vote.cutoff);
                if (vote.movable!==undefined)$("#asset_creator_voteMovable").prop('checked',true);
                $(".asset_creator_voteInputs").attr('disabled',true);
            }

            if (expires!==undefined) {
                $("#asset_creator_expiry").val(expires).attr('disabled',true);
            }
        }

        //todo remove spinner
    } else {

        //not a reissuance remove any options that may conflict with already existing assets.
        let mask=parseInt(divisibility,16);
        for (let i=0;i<9;i++) {
            if ((mask&Math.pow(2,i))===0) $("#asset_creator_divisibility option[value=" + i + "]").attr('disabled', true);
        }

    }


    //show next step
    $(".asset_creator_step").hide();
    $("#asset_creator_step2").show();
});

/*___ _              ___
 / __| |_ ___ _ __  |_  )
 \__ \  _/ -_) '_ \  / /
 |___/\__\___| .__/ /___|
             |_|
 */

let assetCreatorVoteOptions=$("#asset_creator_voteOptions").DataTable({
    responsive: true,
    dom: 'Bfrtip',
    buttons: [
        {
            text: 'Add',
            action: function ( e, dt, node, config ) {
                if (asset_creator_rule_disabled) return;
                let lastIndex=assetCreatorVoteOptions.rows().count();
                assetCreatorVoteOptions.row.add({
                    label: "Vote Option"
                }).rows().every(function ( rowIdx, tableLoop, rowLoop ) {
                    let d = this.data();
                    d.first=(rowIdx===0);
                    d.last=(rowIdx===lastIndex);
                    // noinspection JSUnresolvedFunction
                    this.invalidate();
                }).draw();
            }
        }
    ],
    createdRow: function( row, data, dataIndex ) {
        $('.cellEditable', row).prop('contenteditable',!asset_creator_rule_disabled );
    },
    columns: [
        {
            data: 'null',
            render: (data, type, row) => {
                if (row.address!==undefined) return "";    //no controls if reissuance as they can't be changed
                return `<button class="asset_creator_delete asset_creator_voteOptions">Delete</button><button class="asset_creator_up"${row.first?' disabled':''}>Up</button><button class="asset_creator_down"${row.last?' disabled':''}>Down</button>`;
            },
            orderable: false
        },
        {
            className: 'cellEditable cellEditableString cellEditableCol-label',
            data: 'label',
            orderable: false
        }
    ]
});

let assetCreatorRoyalties=$("#asset_creator_royalties").DataTable({
    responsive: true,
    dom: 'Bfrtip',
    select: {
        style:    'os',
        selector: 'td:first-child'
    },
    buttons: [
        {
            text: 'Add',
            action: function ( e, dt, node, config ) {
                if (asset_creator_rule_disabled) return;
                assetCreatorRoyalties.row.add({
                    address: "Enter Royalty Payout Address",
                    amount: 0
                }).draw();
            }
        }
    ],
    createdRow: function( row, data, dataIndex ) {
        $('.cellEditable', row).prop('contenteditable',!asset_creator_rule_disabled );
    },
    columns: [
        {
            className: "dt-center asset_creator_delete",
            data: null,
            defaultContent: '<i class="fa fa-trash"/>', //todo not showing needs fixing
            orderable: false
        },
        {
            className: asset_creator_rule_disabled?'':'cellEditable cellEditableString cellEditableCol-address',
            data: 'address'
        },
        {
            className: asset_creator_rule_disabled?'':'cellEditable cellEditableNumber cellEditableCol-amount',
            data: 'amount'
        }
    ]
});

let assetCreatorKYC=$("#asset_creator_kycList").DataTable({
    responsive: true,
    columns: [
        {
            data: 'null',
            render: (data, type, row) =>row.name+flags.html(row.code)
        }
    ]
});



//handle aggregation selection
$(document).on('change','#asset_creator_aggregation',()=>{
    let selected=$('#asset_creator_aggregation').val();
    if (selected==="dispersed") {
        $("#asset_creator_divisibility option[value=0]").removeAttr('disabled').prop('selected', true)
            .siblings().attr('disabled', true);
    } else {
        $("#asset_creator_divisibility option").removeAttr('disabled');
    }
});

//handle enable rules check box
$(document).on('change','#asset_creator_rulesEnabled',()=>{
    const checked=$('#asset_creator_rulesEnabled').is(':checked');
    $("#asset_creator_rulesSettingBox")[checked?"show":"hide"]();
});

//handle selecting kyc country
$(document).on('click','#asset_creator_kyc',()=>{
    let selected=$('#asset_creator_kyc').val();
    $("#asset_creator_kycList_div")[((selected==="true")||(selected==="false"))?"hide":"show"]();
});
$(document).ready(function() {
    $("#asset_creator_kycList tbody").on('click','tr',function() {
        $(this).toggleClass('selected');
    });
});

//handle rule table edits
const getTableRowAndColumn=(dom)=>{
    //get row element
    let parent=dom.closest('tr');
    let table=dom.closest('table').DataTable();
    let row=table.row( parent );

    //get column
    let column;
    let classList = dom.attr('class').split(/\s+/);
    for (let className of classList) {
        let parts=className.split("-");
        if (parts[0]==="cellEditableCol") {
            column=parts[1];
            break;
        }
    }

    return {table,row,column};
}
$(document).ready(function() {
    $(document).on('blur',".cellEditableString",function() {
        let {row,column}=getTableRowAndColumn($(this));
        if (column===undefined) return;

        //modify data
        let newValue=$(this).text().trim();
        let data=row.data();
        data[column]=newValue;
        row.data(data);
    });
    $(document).on('blur',".cellEditableNumber",function() {
        let {row,column}=getTableRowAndColumn($(this));
        if (column===undefined) return;

        //modify data
        let newValue=$(this).text().trim();
        let data=row.data();
        let parsed=parseFloat(newValue);
        if (parsed.toString()===newValue) data[column]=parsed;
        row.data(data).draw('null');
    });
    $(document).on('click','.asset_creator_delete',function() {
        if (asset_creator_rule_disabled) return;
        let {table,row}=getTableRowAndColumn($(this));
        row.remove().draw();
    });
    $(document).on('click','.asset_creator_up',function() {
        let {table,row}=getTableRowAndColumn($(this));
        let row2=table.row(row.index()-1);
        let temp=row.data();
        row.data(row2.data());
        row2.data(temp);
        table.draw();
    });
    $(document).on('click','.asset_creator_down',function() {
        let {table,row}=getTableRowAndColumn($(this));
        let row2=table.row(row.index()+1);
        let temp=row.data();
        row.data(row2.data());
        row2.data(temp);
        table.draw();
    });
});

/**
 * Returns list of selected country codes
 * @return {string[]}
 */
const kycList=()=>{
    let rows=assetCreatorKYC.rows({selected:true}).data().toArray();
    let list=[];
    for (let {code} of rows) {
        list.push(code);
    }
    return list;
}


//handle clicks to Get Recipients Button
$(document).on('click','#asset_creator_goToOutputs',async()=>{
    //sanity checks
    if ($("#asset_creator_assetIssuer").val().trim().length===0) return showError("Asset creator must be filled");
    if ($("#asset_creator_assetName").val().trim().length===0) return showError("Asset name must be filled");
    if ($("#asset_creator_description").val().trim().length===0) return showError("Description must be filled");
    let foundIcon=false;
    let names={};
    for (let {name} of assetCreator_fileTable) {
        if (names[name]) return showError("Duplicate file name found");
        if (name==="icon") foundIcon=true;
        names[name]=true;
    }
    if (!foundIcon) return showError("Must contain one file named icon");

    //store data on ipfs
    for (let index in assetCreator_fileTable) {
        let {data}=assetCreator_fileTable[index];
        assetCreator_fileTable[index].cid=await api.cid.write(data);
    }

    //get original values
    let {locked, address}=$('#asset_creator_addresses').data();

    //get divisibility
    const divisibility=parseInt($("#asset_creator_divisibility").val());

    //compute rules
    let rules=false;
    if ($("#asset_creator_rulesEnabled").is(':checked')) {

        //mark if rewritable
        rules= {
            rewritable: $("#asset_creator_rewritable").is(':checked')
        };

        //handle kyc rule
        switch ($("#asset_creator_kyc").val()) {
            case "true":
                rules.kyc=true;
                break;

            case "allow":
                rules.kyc={
                    allow:  kycList()
                };
                break

            case "ban":
                rules.kyc={
                    ban:  kycList()
                };
        }

        //handle royalties rule
        let royaltyRows=assetCreatorRoyalties.rows().data().toArray();
        if (royaltyRows.length>0) {
            rules.royalties={};
            for (let {address, amount} of royaltyRows) {
                rules.royalties[address]=Math.round(amount*100000000);
            }
        }

        //handle currency
        let currency=$("#asset_creator_currency").val();
        if (currency!=="DGB") rules.currency=currency;

        //handle vote
        let expiry=parseInt($("#asset_creator_expiry").val());
        let voteOptions=assetCreatorVoteOptions.rows().data().toArray();
        if (voteOptions.length>0) {
            rules.vote={
                movable:    $("#asset_creator_voteMovable").is(':checked'),
                options:    []
            }
            if (expiry!==0) rules.vote.cutoff=expiry;
            for (let {label} of voteOptions) rules.vote.options.push(label);
        } else if (expiry!==0) {
            rules.expires=expiry;
        }

        //handle deflation
        let deflate=Math.round(Math.pow(10,divisibility)*parseFloat($("#asset_creator_deflate").val()));
        if (deflate!==0) rules.deflate=deflate;

    }

    //create options
    let options={
        locked,rules,divisibility,
        aggregation:    $("#asset_creator_aggregation").val()
    };

    //build meta data
    let metadata={
        assetName:      $("#asset_creator_assetName").val().trim(),
        issuer:         $("#asset_creator_assetIssuer").val().trim(),
        description:    $("#asset_creator_description").val().trim(),
        urls:           []
    };
    for (let index in assetCreator_fileTable) {
        let {name, type, cid} = assetCreator_fileTable[index];
        metadata.urls.push({
            name,
            url:    "ipfs://"+cid,
            mimeType:type
        });
    }
    let siteUrl=$("#asset_creator_site").val().trim();
    if (siteUrl!=="") {
        metadata.site={
            url:    siteUrl,
            type:   "web"
        }
        if (siteUrl.endsWith("/restricted.json")) metadata.site.type="restricted";
    }

    //get tax location
    let tax=$("#tax_location").val();

    //store everything in address table
    $('#asset_creator_addresses').data({locked,address,options,metadata,tax});

    $(".asset_creator_step").hide();
    $("#asset_creator_step3").show();
});

$(document).on('change',".legal_checks",()=>{
    if (($("#asset_creator_rights").prop("checked"))&&($("#tax_location").val()!=="x")) {
        $("#asset_creator_goToOutputs").removeAttr('disabled');
    } else {
        $("#asset_creator_goToOutputs").attr('disabled',true);
    }
});

/*___ _              ___         ___ _ _       _    _    _
 / __| |_ ___ _ __  |_  )  ___  | __(_) |___  | |  (_)__| |_
 \__ \  _/ -_) '_ \  / /  |___| | _|| | / -_) | |__| (_-<  _|
 |___/\__\___| .__/ /___|       |_| |_|_\___| |____|_/__/\__|
             |_|
 */
/**
 * Takes a HTML5 file input and converts to a Blob
 * @param {File}    file
 * @param {string?} name
 * @param {string?} type
 * @return {Promise<{
 *     name:    string,
 *     type:    string,
 *     size:    int,
 *     data:    Blob
 * }>}
 */
const createFileBlob=(file,name,type)=>{
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = function (e) {
            let blob = new Blob([new Uint8Array(e.target.result)], {type: file.type});
            resolve({
                name: name||file.name,
                type: type||file.type,
                size: file.size,
                data: blob
            });
        };
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Uses a file already on IPFS
 * @param {string}  cid
 * @param {string} name
 * @param {string} type
 * @return {Promise<{
 *     name:    string,
 *     type:    string,
 *     size:    int,
 *     data:    Blob,
 *     cid:     string
 * }>}
 */
const createCidBlob=(cid,name,type)=>{
    return new Promise(async(resolve, reject) => {
        let reader = new FileReader();
        reader.onload = function (e) {
            let blob = new Blob([new Uint8Array(e.target.result)], {type});
            resolve({
                name, type,
                size: blob.size,
                data: blob
            });
        };
        reader.readAsArrayBuffer(await api.cors("ipfs://"+cid,type));
    });
}

//handle file names
$(document).on('keyup','.asset_creator_fileName',function(){
    let index=parseInt($(this).data('index'));
    assetCreator_fileTable[index].name=$(this).text().trim();
});

//handle deleting file
$(document).on('click','.asset_creator_fileDelete',function(){
    let index=parseInt($(this).data('index'));
    assetCreator_fileTable.splice(index,1);
    redrawFileTable();
});

//handle files
const assetCreator_uploadedFiles = document.getElementById('asset_creator_uploadedFiles');
const assetCreator_fileInput = document.querySelector('input[type=file]');
let assetCreator_fileTable=[];
const assetCreator_thumbSize=[150,100];
const drawPreviewImage=(index,data)=>{
    let canvas=document.getElementById(`preview-${index}`);
    // noinspection JSUnresolvedFunction
    let ctx = canvas.getContext('2d');
    canvas.width=assetCreator_thumbSize[0];
    canvas.height=assetCreator_thumbSize[1];
    let img = new Image();
    img.onload = function(){
        let newWidth=assetCreator_thumbSize[0];
        let newHeight=assetCreator_thumbSize[1];
        let startWidth=0;
        let startHeight=0;
        let ratio=img.width/img.height;
        if (ratio>newWidth/newHeight) {
            newHeight=newWidth/ratio;
            startHeight=(assetCreator_thumbSize[1]-newHeight)/2;
        } else {
            newWidth=newHeight*ratio;
            startWidth=(assetCreator_thumbSize[0]-newWidth)/2;
        }
        ctx.drawImage(img, startWidth, startHeight,newWidth,newHeight);
    }
    img.src = URL.createObjectURL(data);
}
const drawFileLogo=(index)=>{
    let canvas=document.getElementById(`preview-${index}`);
    // noinspection JSUnresolvedFunction
    let ctx = canvas.getContext('2d');
    canvas.width=assetCreator_thumbSize[0];
    canvas.height=assetCreator_thumbSize[1];

    let w=canvas.width;
    let h=canvas.height;
    let m=Math.min(canvas.width,canvas.height);
    let l=(w-m)/2;
    let t=(h-m)/2;

    //draw circle
    ctx.fillStyle = "#FDCC77";
    ctx.arc(w*0.5, h*0.5, m*0.5, 0,2 * Math.PI);
    ctx.fill();

    //draw white file section
    ctx.beginPath();
    ctx.fillStyle = "#FFFFFF";
    ctx.moveTo(l+m*0.245,t+m*0.152);
    ctx.lineTo(l+m*0.616,t+m*0.152);
    ctx.lineTo(l+m*0.767,t+m*0.306);
    ctx.lineTo(l+m*0.767,t+m*0.609);
    ctx.lineTo(l+m*0.245,t+m*0.609);
    ctx.closePath();
    ctx.fill();

    //draw shaded file section
    ctx.fillStyle = "#E6E6E6";
    ctx.fillRect(l+m*0.500, t+m*0.152, m*0.116, m*0.154);
    ctx.fillRect(l+m*0.500, t+m*0.306, m*0.267, m*0.303);

    //draw black bottom of file
    ctx.fillStyle = "#000000";
    ctx.fillRect(l+m*0.245, t+m*0.609, m*0.522, m*0.241);

    //draw mime type
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "9px Georgia";
    ctx.fillText("No Preview", w*0.500, t+m*0.770);
}
const redrawFileTable=()=>{
    //build html
    let html=''
    let totalSize=0;
    for (let index in assetCreator_fileTable) {
        let {name,type,size}=assetCreator_fileTable[index];
        totalSize+=size;
        let prefix=["EB","PB","TB","GB","MB","kB","B"];
        while ((size>2000)&&(prefix.length>0)) {
            size/=1000;
            prefix.pop();
        }
        let sizeText=(Math.round(size*100)/100).toString()+prefix.pop();
        //todo asset_creator_fileDelete should be changed to X in corner or something.
        html+=`<div class="asset_creator_fileEntry"><div class="asset_creator_fileName" contenteditable="true" data-index="${index}">${name}</div><div class="asset_creator_fileType">${type}</div><div class="asset_creator_fileSize">${sizeText}</div><canvas class="asset_creator_filePreview" id="preview-${index}"></canvas><div class="asset_creator_fileDelete" data-index="${index}">Delete</div></div>`;
    }
    assetCreator_uploadedFiles.innerHTML=html+'<div class="clear"></div>';

    //draw previews
    for (let index in assetCreator_fileTable) {
        let {name,type,size,data}=assetCreator_fileTable[index];
        if (type.startsWith('image/')) {
            drawPreviewImage(index, data);
        } else {
            drawFileLogo(index);
        }
    }

    //show publishing cost
    let cost=totalSize*fileCostPerByte;
    $("#asset_creator_fileCost").html(cost.toFixed(3));
}
let timerFileUploader;
assetCreator_fileInput.addEventListener('change', ()=>{
    // noinspection JSUnresolvedVariable
    for (let file of assetCreator_fileInput.files) {
        createFileBlob(file).then(fileData => {
            //if known mime type remove file extension
            if (fileData.type!=="") fileData.name=fileData.name.replace(/\.[^/.]+$/,"");

            //if first file set name to icon
            if ((assetCreator_fileTable.length===0)&&(fileData.type.substr(0,5)==="image")) fileData.name="icon";

            //record the file
            assetCreator_fileTable.push(fileData);

            //rebuild after slight delay so we don't do to many time
            clearTimeout(timerFileUploader);
            timerFileUploader=setTimeout(redrawFileTable,500);
        });
    }
});

/*___ _              ____
 / __| |_ ___ _ __  |__ /
 \__ \  _/ -_) '_ \  |_ \
 |___/\__\___| .__/ |___/
             |_|
 */
//setup expense table
$("#asset_creator_costs").DataTable({
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


//sending address data table
let asset_creator_addresses=$('#asset_creator_addresses').DataTable({
    responsive: true,
    order: [
        [1, "asc"]
    ],
    columns: [
        {
            className: "dt-center asset_creator_addresses-delete",
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
    drawCallback: async function() {
        let caller=this.api();
        const {address,options,metadata,tax,password}=caller.tables().nodes().to$().data();
        const expense='send_creator_costs';

        if (assetCostsWaiting[expense]===undefined) assetCostsWaiting[expense]=0;
        if (assetCostsWaiting[expense]===2) return; //already 1 pending
        assetCostsWaiting[expense]++;
        if (assetCostsWaiting[expense]===2) return; //will run on complet

        let expenseTable=$("#asset_creator_costs").DataTable();
        let domAssetSend=$("#asset_creator_create");
        domAssetSend.attr('disabled',true);
        let assetTx;
        while (assetCostsWaiting[expense]>0) {
            assetTx = {hex: [], costs: []};
            try {
                let rowCount = caller.data().count();
                if (rowCount > 0) {
                    expenseTable.processing(true);                      //show processing
                    let recipients = {};
                    for (let i = 0; i < rowCount; i++) {
                        let list = caller.row(i).data().recipients;
                        for (let {address, quantity} of list) {
                            if (recipients[address] === undefined) recipients[address] = 0;
                            recipients[address] += quantity;
                        }
                    }
                    assetTx = await api.wallet.build.assetIssuance(recipients, address, options, metadata,tax,password);   //get updated cost
                }
            } catch (e) {
                //error always called on first execution so ignore
                console.log(e);
            }
            expenseTable.clear().rows.add(assetTx.costs).draw();
            assetCostsWaiting[expense]--;
        }
        expenseTable.processing(false);                     //remove processing
        domAssetSend.data({
            txs:        assetTx.hex,
            sha256Hash: assetTx.sha256Hash,
            assetId:    assetTx.assetId,
            signed:     assetTx.signed
        });                   //put unsigned tx in send buttons data
        if (assetTx.hex.length === 0) {
            if ((options!==undefined)&&(!options.locked)&&(assetTx.costs[0].type==="Asset can not be encoded to many outputs")) {
                let password=await getWalletPassword("This asset creation will require multiple txs.  Please provide the wallet password.");
                let data=caller.tables().nodes().to$().data();
                data.password=password;
                caller.tables().nodes().to$().data(password);
                caller.draw();
            }
            domAssetSend.attr('disabled', true);
        } else {
            domAssetSend.removeAttr('disabled');
        }
    }
});

//show/hide send asset types
$(document).on('keyup','#asset_creator_new_address',()=>{
    let type = $("#asset_creator_new_address").val().trim().substr(0,1);
    $(".asset_creator_assetId")[(type==="L")||(type==="U")?"show":"hide"]();
});

//handle removing item from table
$('#asset_creator_addresses tbody').on( 'click', 'td.asset_creator_addresses-delete', function (e) {
    e.preventDefault();
    asset_creator_addresses.row( $(this).parents('tr') ).remove().draw();
} );

//add address to sending table
$(document).on('click','#asset_creator_new',async()=>{
    try {
        let decimals=$("#asset_creator_addresses").data().options.divisibility;
        let assetsPerHolder = $("#asset_creator_assetId_type_holder").prop("checked");
        let address = $("#asset_creator_new_address").val().trim();
        let quantityStr=$("#asset_creator_new_quantity").val().trim();
        let quantity = Math.round(parseFloat(quantityStr)*Math.pow(10,decimals));
        if ((quantity<=0)||(quantityStr==="")) {
            showError("Invalid Quantity");
            return;
        }
        let data = {address, quantity: satToDecimal(quantity,decimals),recipients:[{address,quantity}]};
        if ((address[0] === "L") || (address[0] === "U")) {
            //lookup height and asset
            let height = api.stream.get("height");
            let assetData = api.stream.get(address);
            await Promise.all([height, assetData]);

            //get total assets
            let total=0;
            let {holders}=await assetData;
            let recipients=[];
            for (let address in holders) {
                let recipientQuantity=assetsPerHolder?quantity:parseInt(holders[address])*quantity;
                total+=recipientQuantity;
                recipients.push({address,quantity:recipientQuantity})
            }

            //update data
            data = {
                assetId: address,                                   //value in address variable actually an assetId
                type: assetsPerHolder ? "holder" : "asset",
                height: await height,
                amount: satToDecimal(quantity,decimals),                 //store the per holder value as amount
                quantity: satToDecimal(total,decimals),                   //store total as quantity
                recipients                                               //list of those that will receive it
            };

        }
        asset_creator_addresses.row.add(data).draw();
    } catch (e) {
        console.log(e);
        showError("Invalid AssetId");   //errors only thrown when assetId is invalid
    }
});


$(document).on('click','#asset_creator_create',async()=>{
    let {txs,sha256Hash,assetId,signed}=$("#asset_creator_create").data();

    //get password
    let password;
    if (!signed) password=await getWalletPassword();

    //open window to show progress
    $('.creatingAssetHideAtStart').hide();
    $("#creatingAssetWarning").show();
    $("#creatingAssetId").text(assetId);
    let modal=new bootstrap.Modal(document.getElementById('creatingAssetModal'));
    modal.show();

    //send to chain
    try {
        if (!signed) {
            let txid = await api.wallet.send(txs[0], password);
            $("#creatingAssetTXID").text(txid);
            $("#creatingAssetDetectLi").show();
        } else {
            let txids=[];
            while (txs.length>0) {
                let tx=txs.unshift();
                try {
                    let txid = await api.wallet.sendSigned(tx);
                    txids.push(txid);
                } catch (e) {
                    //there was an error try again in 10seconds
                    txs.shift(tx);
                    console.log("failed to send: "+tx);
                    console.log(e);
                    console.log("retry in 10 seconds");
                    await sleep(10000);
                }
            }
            $("#creatingAssetTXID").text(txids.join(","));
            $("#creatingAssetDetectLi").show();
        }
    } catch (e) {
        modal.hide();
        showError(e);
    }

    //monitor digiassetX progress
    let timer=setInterval(async()=>{
        let state=await api.digiassetX.asset.permanent(sha256Hash);
        switch (state) {
            case 2:
                $("#creatingAssetPermanent").text("✓");
                clearInterval(timer);
                $("#creatingAssetWarning").hide();
                $("#creatingAssetDone").show();
            case 1:
                $("#creatingAssetDetect").text("✓");
                $("#creatingAssetPermanentLi").show();
            case 0:
        }
    },60000);
});
