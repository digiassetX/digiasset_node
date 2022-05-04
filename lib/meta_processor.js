const isHash = /[0-9A-Fa-f]{64}/;

/**
 * Returns a url to use nodes cors api
 * @param {string}  url
 * @param {string}  dataHash - default to "" because many V2 assets erroneously used this for there hash value so should be ignored if empty string
 * @return {string}
 */
const makeCorsUrl=(url,dataHash="")=>{
    //ignore data url
    if (url.indexOf("data:")!==-1) return url;

    //change to cors
    let parts = url.split("://");
    if (dataHash !== "") {
        if (isHash.test(dataHash)) return `/api/cors/${parts[0]}/sha256-${dataHash}/${parts[1]}`;
        return '/images/corrupt_image.png';
    }
    return `/api/cors/${parts[0]}/${parts[1]}`;
}

/**
 * Generates a html tag for an entry in the urls section
 * @param {string}  url
 * @param {string}  mimeType
 * @param {string}  dataHash
 * @return {string}
 */
const processUrl=({url,mimeType,dataHash})=>{
    //convert to cors
    let corsURL=makeCorsUrl(url,dataHash);
    if ((url.indexOf("data:")!==-1)&&(mimeType===undefined)) {
        let start=url.indexOf("data:image/");
        let end=url.indexOf(",",start+1);
        mimeType=url.substr(start+6,end-start-6);
    }

    //convert to html
    switch (mimeType) {
        case "image/jpg":
        case "image/jpeg":
        case "image/png":
        case "image/gif":
            return `<img src="${corsURL}" class="asset_data_image" alt="${url}">`;

        case "image/svg+xml":
            // noinspection HtmlUnknownAttribute
            return `<svg width="400" height="400"><image xlink:href="${corsURL}" width="400" height="400"></image></svg>`;

        case "video/mp4":
            return `<video class="asset_data_video" controls><source src="${corsURL}"></video>`;

        default:
            return `<a href="${url}" target="_blank">Open</a>`;
    }
}

/**
 * Makes Asset JSON Data Pretty
 * @param data
 * @param votes
 * @return {string}
 */
module.exports=({data,votes=[]})=>{
    //look for special values in urls
    let urls=[],icon,description=data.description;
    for (let {name,url,mimeType,dataHash} of data.urls) {
        switch (name) {
            case "icon":
                icon={url,mimeType,dataHash};
                break;
            case "description":
                description={url,mimeType,dataHash};
                break;
            default:
                urls.push({name,url,mimeType,dataHash});
        }
    }

    //make meta data pretty
    let html='<h1>Meta Data:</h1>';
    if (icon!==undefined) html+=processUrl(icon);
    html+= `<br><table class="table table-responsive">`;
    html+=`<tr><td style="background-color:white">Asset Name</td><td style="background-color:white">${data.assetName}</td></tr>`;
    if (data.assetId!==undefined) html+=`<tr><td style="background-color:white">Asset ID</td><td style="background-color:white">${data.assetId}</td></tr>`;
    if (data.issuer!==undefined) html+=`<tr><td style="background-color:white">Issuer</td><td style="background-color:white">${data.issuer}</td></tr>`;
    if ((data.site!==undefined)&&(data.site.url!=="")) {
        let url=(data.site.type==="web")?data.site.url:data.site.url.substr(0,data.site.url.length-16);
        html+=`<tr><td style="background-color:white">Web Site</td><td style="background-color:white"><a href="${url}" target="_blank">${url}</a></td></tr>`;
    }
    html+=`</table>`;
    if (typeof description==="string") {
        description = description.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/\n/g, "<br>");
        html += `Description: <div class="description">${description}</div><br>`;
    } else {
        html += `Description: <div class="description"><iframe src="${makeCorsUrl(description.url,description.dataHash)}" width="100%" height="400px"></iframe></div><br>`;
    }

    if (votes.length>0) {
        html+="Vote Options:<br><ul>";
        for (let {address,label} of votes) html+=`<li>${label}</li>`;
        html+="</ul>";
    }

    //show remaining included files
    if (urls.length>0) {
        html+="Extra Included Media:<br>";
        for (let url of urls) {
            html+="name: <br>";
            html+=processUrl(url);
        }
    }
    return html;
}
