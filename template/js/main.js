//update every minute the last block scanned.  Value returned is multiple of 1000 blocks not individual block
// noinspection JSUnfilteredForInLoop

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
                render: (data) => (data===true)?"✓":""
            },
            {
                className: 'columnRejected',
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
 * Creates a button for sending assets
 * @param {{
 *      label:  string,
 *      assetId:  string,
 *      value:  string,
 *      decimals: int,
 *      cid: string,
 *      cache: {
 *          rules:  AssetRules?
 *          kyc:    KycState?,
 *          issuer: string,
 *          divisibility: int,
 *          metadata: {
 *              txid:    string,
 *              cid:     string
 *          }[]
 *      }
 * }} row
 * @param {string}  label
 * @param {"vote_asset"|"send_asset"}  triggerClass
 */
const createAssetSendButton=(row,label,triggerClass)=>{
    let html=`<button class="cell button btn ${triggerClass}"`;
    for (let index in row) {
        if (index==="cache") continue;  //skip cache
        html+=` data-${index.toLowerCase()}="${row[index].toString()}"`;
    }
    if (triggerClass==="vote_asset") html+=` data-options='${JSON.stringify(row.cache.rules.vote.options)}'`;
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
                let html='';
                if ((row.cache.rules!==undefined)&&(row.cache.rules.vote!==undefined)) {
                    html+=createAssetSendButton(row,'Vote','vote_asset');
                    if (!row.cache.rules.vote.movable) return html;  //don't allow move option if not movable
                }
                html+=createAssetSendButton(row,'Send','send_asset');
                return html;
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

//vote cost data table
let vote_assets_cost=$("#vote_assets_costs").DataTable({
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
async function redrawAssetCosts() {
    let caller=this.api();
    const {expense,assetid,label}=caller.tables().nodes().to$().data();
    let expenseTable=$("#"+expense).DataTable();
    try {
        let domAssetSend=$(".asset_send");
        let rowCount=caller.data().count();
        if (rowCount === 0) {
            expenseTable.clear().draw();
            domAssetSend.attr('disabled',true);
        } else {
            domAssetSend.attr('disabled',true);
            expenseTable.processing(true);                      //show processing
            let recipients={};
            for (let i=0;i<rowCount;i++) {
                let list=caller.row(i).data().recipients;
                for (let {address,quantity} of list) {
                    if (recipients[address]===undefined) recipients[address]=0;
                    recipients[address]+=quantity;
                }
            }
            assetCostsWaiting++;
            let {costs, hex} = await api.wallet.build.assetTx(recipients,assetid,label);   //get updated cost
            assetCostsWaiting--;
            expenseTable.clear().rows.add(costs).draw();        //update table
            domAssetSend.data("tx",hex);                   //put unsigned tx in send buttons data
            if (assetCostsWaiting===0) {
                expenseTable.processing(false);                     //remove processing
                if (hex!=="") $("._asset_send").removeAttr('disabled');     //reenable send button if no error
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
                return `<button class="vote_assets_neg"${row.count>0?"":" disabled"}>-</button>${row.count}<button class="vote_assets_pos"${vote_assets_options.votesLeft>0?"":" disabled"}>+</button>`
            },
            orderable: false
        }
    ],
    drawCallback: redrawAssetCosts
});

//handle adding removing votes
$(document).on('click','.vote_assets_neg',function(e) {
    e.preventDefault();
    vote_assets_options.votesLeft++;

    //update rows
    let current=vote_assets_options.row( $(this).parents('tr') );
    let data=current.data();
    data.count--;
    data.recipients[0].quantity=data.count;
    if (data.count===0) data.recipients=[];
    current.data(data);

    //handle change
    let lastIndex=vote_assets_options.rows().count()-1;
    let last=vote_assets_options.row(lastIndex);
    last.data({left:true,label:"Remaining",count:vote_assets_options.votesLeft,recipients:[]});

    //enable + if any left
    if (vote_assets_options.votesLeft===1) $(".vote_assets_pos").removeAttr('disabled')

    //redraw table
    vote_assets_options.draw(false);
});
$(document).on('click','.vote_assets_pos',function(e) {
    e.preventDefault();
    vote_assets_options.votesLeft--;

    //update row
    let current=vote_assets_options.row( $(this).parents('tr') );
    let data=current.data();
    data.count++;
    if (data.recipients.length===0) data.recipients=[{address: data.address}];
    data.recipients[0].quantity=data.count;
    current.data(data);

    //handle change
    let lastIndex=vote_assets_options.rows().count()-1;
    let last=vote_assets_options.row(lastIndex);
    last.data({left:true,label:"Remaining",count:vote_assets_options.votesLeft,recipients:[]});

    //disable + if none left
    if (vote_assets_options.votesLeft===0) $(".vote_assets_pos").attr('disabled',true);

    //redraw table
    vote_assets_options.draw(false);
});

//draw vote pop up
$(document).on('click','.vote_asset',function() {
    //add necessary data to table
    /** @type {{label,assetid,cid,value,decimals,receiver,options}} */let data=$(this).data();
    data.expense="vote_assets_costs";
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
    data.expense="vote_assets_costs";
    $("#send_assets_addresses").data(data);

    //gather recipient info
    $("#SAMLabel").text("Send " + data.assetid + (data.cid == undefined ? "" : `:${data.cid}`));
    send_assets_addresses.clear();

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
            let height = api.stream("height");
            let assetData = api.stream(address);
            await Promise.all([height, assetData]);

            //get total assets
            let total=0;
            let {holders}=await assetData;
            let recipients=[];
            for (let address in holders) {
                let quantity=assetsPerHolder?quantity:parseInt(holders[address])*quantity;
                total+=quantity;
                recipients.push({address,quantity})
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

    } catch (e) {
        console.log(e);
        showError("Invalid AssetId");   //errors only thrown when assetId is invalid
    }
});

//handle sending transactions
$(document).on('click','.sendTx',async function(){
    let hex=$(this).data("tx");
    let password=await getWalletPassword();
    try {
        let txid = await api.wallet.send(hex, password);
        $("#txid").text(txid);
        (new bootstrap.Modal(document.getElementById('WalletPasswordModal'))).show();
    } catch (e) {
        showError(e);
    }
});

/**
 * Request the wallet password from user
 * @return {Promise<string>}
 */
const getWalletPassword=async()=>{
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
                data: 'balance',
                defaultContent: 'Need Stream'
            },
            {
                data: 'null',
                render: (data, type, row) => (row.kyc===undefined)?"X":"✓"
            }
        ]
    });
    $('#kycAddresses tbody').on('click', 'tr', function () {
        console.log("x");
        $(this).toggleClass('selected');
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
            case "donate":   //donate
                options.label=$("kycLabel").val().trim();
                options.goal=parseInt($("kycGoal").val().trim());
                if (options.label.length<2) throw "Invalid Label Length";
                break;

            case "secret":   //secret
                options.pin=$("kycPin").val().trim();
                if (options.pin.length<4) throw "Invalid Pin Length";
        }

        $("#kycDone2").removeAttr('disabled');
    } catch (e) {
        $("#kycDone2").attr('disabled',true);
    }

    //submit if selected
    if (submit) {
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
    validateKYCInputs(true);
});