async function getS3PresignedUrl({ method, file_type, key = "" }) {
    `send a fetch request to aws api endpoint that invokes a lambda function that generates a presigned url to perform action on a s3 bucket
    :param method: string: the name of the reqest method the url will be used to perform. GET, PUT accepted
    :param file_type: string: the file type of the object, pdf and mp3 accepted
    :param key: string: the key used to identify the object in the s3 bucket, leave blank on put requests and one will be generated
    :return: object: containing the presigned url and the objects key in the bucket. keys: presignedUrl, key`

    console.log('getS3PresignedUrl', method, key, file_type)
    let body = { "request_method": method, "key": key, "file_type": file_type }

    try {
        let data = await invokeAWSLambda({ apiEndpoint: "get_s3_presigned_url", body: body })
        console.log(data)
        let dataBodyObj = JSON.parse(data.body)
        console.log(dataBodyObj)
        let presignedUrl = dataBodyObj.url
        console.log(presignedUrl)
        let key = dataBodyObj.key
        console.log(key)

        return { presignedUrl, key }
    } catch (error) {
        console.error(error);
    }
}

async function uploadToS3({ url, file }) {
    `upload a file to s3 bucket.
    :param url: string: a presigned aws url to put an object in a s3 bucket.
    :param file: file object: a file to be uploaded to the bucket, pdf.`

    console.log('uploads3')
    console.log(url)

    try {

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/pdf',
            },
            body: file
        });
        let data = await response
        console.log(data)
        console.log(data.status)
        console.log(data.body)
    } catch (error) {
        console.log(error);
    }
}

async function convertPdfToMp3({ key }) {
    `send a fetch request to a aws api endpoint to invoke a lambda function that converts a pdf file with a given key to a mp3 file.
    :param key: string: the key of the pdf file in the s3 bucket.
    :return: string: the key to identify the newly created mp3 file in the s3 bucket.`

    console.log('convertpdfmp3')
    let body = { "key": key }
    try {
        let data = await invokeAWSLambda({ apiEndpoint: "convert_pdf_to_audio", body: body })
        console.log(data)
        let dataBodyObj = JSON.parse(data.body)
        let key = dataBodyObj.key
        console.log(key)
        return key
    } catch (error) {
        console.error(error);
    }
}

function loadMp3OnPage({ url, filename = "" }) {
    `loads mp3 audio into the audio player and makes it available via the download button on the webpage.
    :param url: string: aws presigned url to get the mp3 file from the s3 bucket.
    :param filename: string: the name of the file`

    console.log('loadmp3')
    let audioSource = document.querySelector('#audioSource')
    audioSource.src = url
    document.getElementById('audioPlayer').load()

    let downloadButton = document.querySelector('#downloadButton')
    downloadButton.href = url
    downloadButton.download = filename + ".mp3"
}

function loadingSpinner({ state }) {
    `loads a spinner to signify loading
    :param state: string: either "on" to make the spinner visible or "off" to hide it`

    let spinner = document.querySelector('.spinner-border')
    if (state == 'on') {
        spinner.style.visibility = 'visible'
    } else if (state == 'off') {
        spinner.style.visibility = 'hidden'
    }
}

async function saveMp3ToSite() {
    `sends a fetch request to a aws api endpoint to invoke a lamdba funcion that saves the key of the mp3 to a database, sends request to differnet endpoints depending
    if user is signed in or signed out`

    console.log('saveMp3ToSite')
    let mp3key = readCookie({ cookieKey: 'mp3key' })
    let authorised = readCookie({ cookieKey: 'Authorised' })
    let apiEndpoint;
    let authorization;
    if (authorised) {
        apiEndpoint = "upload_key_to_user_table"
        authorization = true
    } else {
        apiEndpoint = "upload_anonymous_key"
        authorization = false
    }
    console.log(mp3key)
    console.log(authorised)
    console.log(authorization)
    console.log(apiEndpoint)
    let body = { 'mp3Key': mp3key }
    try {
        let data = await invokeAWSLambda({ apiEndpoint: apiEndpoint, body: body, authorization: authorization })
        console.log(data)
    } catch (error) {
        console.log(error)
    }

}


async function loadUserMp3Table() {
    `loads the logged in users saved mp3 files into a table after getting their presigned urls from a aws api endpoint`

    console.log('loadUserMp3Table')

    let tableDiv = document.querySelector('#tableDiv')
    let tableHTML = `<table class="table table-hover">
    <thead>
        <tr>
            <th scope="col">File</th>
            <th scope="col">Player</th>
            <th scope="col">Download</th>
        </tr>
    </thead>
    <tbody id="userMp3TableBody">
    </tbody>
    </table>`
    tableDiv.innerHTML = tableHTML
    try {
        let data = await invokeAWSLambda({ apiEndpoint: "get_mp3_presigned_urls_for_user", body: {}, authorization: true })
        // list of objects containing the mp3key and the presigned url
        let userKeyUrlList = data.body
        console.log(userKeyUrlList)

        let userMp3TableBody = document.querySelector('#userMp3TableBody')

        for (let obj of userKeyUrlList) {
            let key = obj.mp3Key
            let presignedUrl = obj.presignedUrl
            console.log(key)
            console.log(presignedUrl)
            // set mp3 key as head of new table row
            let tableRow = document.createElement('tr')
            let tableHead = document.createElement('th')
            tableHead.innerHTML = key
            tableRow.appendChild(tableHead)
            // create a audio player with the source a presigned url of the mp3, append it to a table data el and append that to the table row
            let tableDataAudio = document.createElement('td')
            let audioPlayer = document.createElement('audio')
            audioPlayer.setAttribute('controls', true)
            let audioSource = document.createElement('source')
            audioSource.type = "audio/mpeg"
            audioSource.src = presignedUrl
            audioPlayer.appendChild(audioSource)
            tableDataAudio.appendChild(audioPlayer)
            audioPlayer.load()
            tableRow.appendChild(tableDataAudio)
            // create a link to download the mp3 using presigned url, append it to a table data el and append that to the table row
            let tableDataButton = document.createElement('td')
            let downloadButtonLink = document.createElement('a')
            downloadButtonLink.setAttribute('href', presignedUrl)
            downloadButtonLink.innerHTML = 'Download'
            downloadButtonLink.className += 'btn btn-primary'
            tableDataButton.appendChild(downloadButtonLink)
            tableRow.appendChild(tableDataButton)
            // append table row to table
            userMp3TableBody.appendChild(tableRow)
        }
    } catch (error) {
        console.log(error)
        tableDiv.innerHTML = ""
    }
}

async function invokeAWSLambda({ apiEndpoint, body, authorization = false }) {
    `send a fetch request using the post method to a given aws api endpoint
    :param apiEndpoint: string: a aws api endpoint used to call a lambda function
    :param body: object: an object that will be sent as the body of the post request to the endpoint
    :param authorization: boolean: true is user is signed in false if user signed out, used to set the relevent headers
    :return: object: the response sent back from the invoked lambda function`

    console.log('invokeaws')
    console.log(authorization)

    let invokeUrl = 'https://ws206gr9jh.execute-api.eu-west-2.amazonaws.com/test/'
    let url = `${invokeUrl}${apiEndpoint}`
    let headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
    if (authorization === true) {
        // if authorisation required set headers and add access token to body
        headers['Authorization'] = sessionStorage.getItem('idToken')
        body['accessToken'] = sessionStorage.getItem('accessToken')
        console.log(headers)
        console.log(body)
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        let data = await response.json()
        return data
    } catch (error) {
        console.log(error)
    }
}


function readCookie({ cookieKey }) {
    `reads a cookie of a certain key
    :param cookieKey: string: the key of the the cookie
    :return: returns the value of the cookie or if no cookie with given key found returns null`

    console.log(document.cookie)
    const cookieKeys = document.cookie.split('; ')
    let Cookie = cookieKeys.find((row) => row.startsWith(cookieKey))
    if (Cookie) {
        let value = Cookie.split('=')[1]
        console.log(value)
        return value
    } else {
        return null
    }
}


async function attemptAuthorizeUser() {
    `Checks if valid jwt tokens can be retrieved for the user. Checks sessionstorage for id and access tokens and checks if they have not expired.
    If none found or expired checks cookies for a refresh token or the url for a code grant, if either found uses them to attempt to get new id and access tokens
    from the aws oauth2/token endpoint. Sets a cookie with key Authorised if jwt retrieved, also stores idToken, accessToken and 
    tokenExpiry in sessionStorage. Deletes Authorised cookie if they no jwt retrieved.
    :return: boolean: true if valid jwt tokens can be retrieved false if they cannot`

    console.log('attemptAuthorizeUser')
    let currentTime = new Date(Date.now())
    let tokenExpiry = new Date(sessionStorage.getItem('tokenExpiry'))
    console.log(currentTime)
    console.log(tokenExpiry)
    console.log(tokenExpiry.toUTCString())
    if (currentTime < tokenExpiry && sessionStorage.getItem('idToken') && sessionStorage.getItem('accessToken')) {
        // check if tokens in session storage and if they are not expired
        console.log('valid tokens in sessionStorage')
        document.cookie = `Authorised=${true}; path=/; expires=${tokenExpiry.toUTCString()}`
        return true
    }
    let url = window.location.href
    console.log(url)
    let urlObj = new URL(url)
    console.log(urlObj)
    let authCode = urlObj.search.split('=')[1]
    console.log(authCode)
    let refreshToken = readCookie({ cookieKey: 'refreshToken' })
    let clientId = '1jdksnkvu02f7qvr5l7j7ichkf'
    let body = {}
    if (refreshToken) {
        // if refresh token found in cookie configure body to use refresh token to get new id and access tokens
        console.log('refresh token')
        body = { grant_type: 'refresh_token', client_id: clientId, refresh_token: refreshToken }
    } else if (authCode) {
        // if code grant found in url configure body to use code grant to get new id and access tokens
        console.log('code grant')
        body = { grant_type: 'authorization_code', client_id: clientId, redirect_uri: 'https://master.d31p3h7ojd8b9q.amplifyapp.com/', code: authCode }
    } else {
        // no tokens in sesssion storage, refresh token cookie or code grant in url, user cannot be signed in tokens cannot be retrieved
        console.log('user cannot be signed in')
        document.cookie = `Authorised=false; path=/; max-age=0`
        return false
    }
    // convert body object to form-urlencoded string
    var formBody = [];
    for (var property in body) {
        var encodedKey = encodeURIComponent(property);
        var encodedValue = encodeURIComponent(body[property]);
        formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");
    console.log(body)
    console.log(formBody)
    try {
        const response = await fetch('https://pdfaudio.auth.eu-west-2.amazoncognito.com/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formBody
        });
        let data = await response
        console.log(data)
        let jsonData = await data.json()
        console.log(jsonData)
        try {
            // save tokens and expiry time in sessionStorage set refreshtoken cookie if it doesnt already exist, set Authorised cookie
            sessionStorage.setItem("accessToken", jsonData['access_token'])
            sessionStorage.setItem("idToken", jsonData['id_token'])
            let tokenExpiry = new Date(Date.now() + jsonData['expires_in'] * 1000)
            sessionStorage.setItem("tokenExpiry", tokenExpiry)
            if (!refreshToken) {
                document.cookie = `refreshToken=${jsonData['refresh_token']}; path=/; max-age=10000`
            }
            document.cookie = `Authorised=${true}; path=/; expires=${tokenExpiry.toUTCString()}`
            return true
        } catch (error) {
            // error storing tokens
            console.error(error)
            document.cookie = `Authorised=false; path=/; max-age=0`
            return false
        }
    } catch (error) {
        // error with fetch request
        console.error(error)
        document.cookie = `Authorised=false; path=/; max-age=0`
        return false
    }
}

//function loadWebpageElements() {
//    document.cookie = `Authorised=${false}; path=/; max-age=0`
//    console.log(document.cookie)
//    let authorised = readCookie({ cookieKey: 'Authorised' })
//    console.log(authorised)
//    console.log(!!authorised)
//    let audioPlayer = document.querySelector('#audioPlayer')
//    audioPlayer.style.visibility = 'hidden'
//    let downloadButton = document.querySelector('#downloadButton')
//    downloadButton.style.visibility = 'hidden'
//    let saveButton = document.querySelector('#saveButton')
//    //saveButton.style.visibility = 'hidden'
//    let authoriserLink = document.querySelector('#authoriserLink')
//    if (!authorised) {
//        authoriserLink.innerHTML = 'Sign in'
//        authoriserLink.href = "https://pdfaudio.auth.eu-west-2.amazoncognito.com/login?response_type=code&client_id=1jdksnkvu02f7qvr5l7j7ichkf&redirect_uri=https://master.d31p3h7ojd8b9q.amplifyapp.com/"
//    } else {
//        authoriserLink.innerHTML = 'Sign out'
//        authoriserLink.href = "https://pdfaudio.auth.eu-west-2.amazoncognito.com/logout?client_id=1jdksnkvu02f7qvr5l7j7ichkf&logout_uri=https://master.d31p3h7ojd8b9q.amplifyapp.com/"
//    }
//}




export { getS3PresignedUrl, uploadToS3, convertPdfToMp3, loadMp3OnPage, loadingSpinner, saveMp3ToSite, loadUserMp3Table, attemptAuthorizeUser, readCookie }