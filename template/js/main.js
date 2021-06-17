//update every minute the last block scanned.  Value returned is multiple of 1000 blocks not individual block
let getHeight=async()=>{
    let height=await api.getHeight();
    $("#last_block").html("<strong>Last Block Scanned</strong> : "+height);
}
setInterval(getHeight,60000);
getHeight();

//show the cid data
let lists={unsorted:[],approved:[]};
let dataTableUnsorted = $('#unsorted').DataTable();
let dataTableApproved = $('#approved').DataTable();
let redraw=()=> {
    api.list.unsorted().then((cids) => {
        lists.unsorted=cids;
        dataTableUnsorted.clear();
        for (let cid of cids) {
            dataTableUnsorted.row.add([
                cid,
                `<button class="cell view button" cid="${cid}" list="unsorted">View</button>`,
                `<button class="cell approve button" cid="${cid}">Approve</button>`,
                `<button class="cell reject button" cid="${cid}">Reject</button>`
            ]);
        }
        dataTableUnsorted.draw(false);
    });
    api.list.approved().then((cids) => {
        lists.approved=cids;
        dataTableApproved.clear();
        for (let cid of cids) {
            dataTableApproved.row.add([
                cid,
                `<button class="cell view button" cid="${cid}" list="approved">View</button>`
            ]);
        }
        dataTableApproved.draw(false);
    });
}
redraw();
setInterval(redraw,60000);

//handle view click event
let list="";
let showView=async(cid)=>{
    let data=await api.cid(cid);
    if (data.type==="url") {
        $("#window_data").attr('src',data.src);
    } else {
        $("#window_data").contents().find('html').html(data.html);
    }

    $("#window_approve").attr('cid', cid);
    $("#window_reject").attr('cid', cid);
    $("#window").show();
    $("#shadow").show();
}
$(document).on('click','.view',function(){
    let cid=$(this).attr('cid');
    list=$(this).attr('list');
    showView(cid);
});

//handle approve click event
$(document).on('click','.approve',function(){
    //approve the meta data
    let cid=$(this).attr('cid');
    api.approve(cid).then(redraw);

    //see if there are more and open next value if there are
    let next="";
    if (list!=="") {
        for (let nextCid of lists[list]) {
            if (nextCid!==cid) {
                next=nextCid;
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
        showView(next);
    }
});

//handle reject click event
$(document).on('click','.reject',function(){
    let cid=$(this).attr('cid');
    api.reject(cid).then(redraw);

    //see if there are more and open next value if there are
    let next="";
    if (list!=="") {
        for (let nextCid of lists[list]) {
            if (nextCid!==cid) {
                next=nextCid;
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
        showView(next);
    }
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
$(document).ready(async()=>{
    let isLogedIn=await api.user.state();
    if (!isLogedIn) (new bootstrap.Modal(document.getElementById('LoginModal'))).show();
});
