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
                `<button class="cell view button btn btn-outline-dark" cid="${cid}" list="unsorted">View</button>`,
                `<button class="cell approve button btn btn-outline-success" cid="${cid}">Approve</button>`,
                `<button class="cell reject button btn btn-outline-danger" cid="${cid}">Reject</button>`
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
    try {
        let data = await api.cid(cid);
        if (data.type === "url") {
            $("#window_data").attr('src', data.src);
        } else {
            $("#window_data").contents().find('html').html(data.html);
        }

        $("#window_approve").attr('cid', cid);
        $("#window_reject").attr('cid', cid);
        $("#window").show();
        $("#shadow").show();
    } catch (e) {
        location.reload();
    }
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
const showLoginBox=()=>(new bootstrap.Modal(document.getElementById('LoginModal'))).show();
$(document).ready(async()=>{
    let isLogedIn=await api.user.state();
    if (!isLogedIn) {
        //not logged in and needs to be
        showLoginBox();
        $("#menu_login").show();
    } else {
        //logged in or no login
        $("#menu_settings").removeAttr('disabled');
        let userList=await api.user.list();
        if (userList.length>0) $("#menu_logout").show();    //actually logged in
        if (userList.length>1) {
            $("#menu_remove_user").show();
            for (let user of userList) {
                $('#remove_user').append(new Option(user, user));
            }
        }
    }
});
$(document).on('click','#menu_login',showLoginBox);

//handle login request
$(document).on('click','#login_submit',async()=>{
    let user=$("#login_user").val().trim();
    let pass=$("#login_pass").val().trim();
    let success=await api.user.login(user,pass);
    if (success) {
        location.reload();
    } else {
        //todo show success.error
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
    let success=await api.user.add(user,pass);
    if (success) {
        //todo make better success screen
        location.reload();
    } else {
        //todo show success.error
    }
});

//handle remove user
$(document).on('click','#menu_remove_user',async()=>{
    (new bootstrap.Modal(document.getElementById('RemoveModal'))).show();
});
$(document).on('click','#remove_submit',async()=>{
    let user=$("#remove_user").val();
    let success=await api.user.remove(user);
    if (success) {
        location.reload();
    } else {
        //todo show success.error
    }
});

