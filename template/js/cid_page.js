$(document).on('click','#refreshChain',async()=>{
    $("#chainData").html("Refreshing");//todo change to spinner
    let assetId=$('#refreshChain').data('assetid');
    let chainData=await api.stream.get(assetId,false);
    $("#chainData").html(JSON.stringify(chainData, null, 4));
});