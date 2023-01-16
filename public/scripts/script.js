uploadPdfForm = document.querySelector('#pdfForm')
console.log(uploadPdfForm)
uploadPdfForm.addEventListener('submit', (e) => { uploadPDF(e) })

saveButton = document.querySelector('#saveButton')
console.log(saveButton)
saveButton.addEventListener('click', (e) => { saveMp3ToSite(e) })

loadingSpinner(state = 'off')

async function uploadPDF(e) {
    e.preventDefault()
    console.log('uploadPdf')
    loadingSpinner(state = 'on')

    //get file from form
    formdata = new FormData(e.target)
    pdfFile = formdata.get('pdfFile')
    filename = pdfFile.name.slice(0, pdfFile.name.length - 4)
    //filename = pdfFile.name
    console.log(pdfFile)

    //tokens = getTokens()

    // get url to upload pdf to s3 bucket
    pdfUploadDataObj = await getS3PresignedUrl(method = 'PUT', file_type = 'pdf')

    // upload pdf to s3 bucket
    await uploadToS3(url = pdfUploadDataObj.presignedUrl, file = pdfFile)

    // convert the uploaded pdf to mp3
    mp3Key = await convertPdfToMp3(key = pdfUploadDataObj.key)

    // get url to download the mp3 from s3 bucket
    mp3DownloadDataObj = await getS3PresignedUrl(method = 'GET', file_type = 'mp3', key = mp3Key)

    // make mp3 available in audio player and download button
    loadMp3OnPage(url = mp3DownloadDataObj.presignedUrl, filename = filename)

    loadingSpinner(state = 'off')

}

async function getS3PresignedUrl(method, file_type, key = "") {
    `send a fetch request to aws api endpoint that invokes a lambda function that generates a presigned url to perform action on a s3 bucket
    :param method: the name of the reqest method the url will be used to perform. GET, PUT accepted
    :param key: the key used to identify the object in the s3 bucket, leave blank on put requests and one will be generated
    :return: object containing the presigned url and the objects key in the bucket. keys: presignedUrl, key`

    console.log('getS3PresignedUrl', method, key, file_type)

    try {
        const response = await fetch('https://ws206gr9jh.execute-api.eu-west-2.amazonaws.com/test/get_s3_presigned_url', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ "request_method": method, "key": key, "file_type": file_type })
        });
        data = await response.json()
        console.log(data)
        dataBodyObj = JSON.parse(data.body)
        console.log(dataBodyObj)
        presignedUrl = dataBodyObj.url
        console.log(presignedUrl)
        key = dataBodyObj.key
        console.log(key)

        return { presignedUrl, key }
    } catch (error) {
        console.error(error);
    }
}

async function uploadToS3(url, file) {
    `upload a file to s3 bucket.
    :param url: a presigned aws url to put an object in a s3 bucket.
    :param file: a file to be uploaded to the bucket, pdf.`

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
        data = await response
        console.log(data)
        console.log(data.status)
        console.log(data.text)
        console.log(data.body)
    } catch (error) {
        console.log(error);
    }
}

async function convertPdfToMp3(key) {
    `send a fetch request to a aws api endpoint to invoke a lambda function that converts a pdf file with a given key to a mp3 file.
    :param key: the key of the pdf file in the s3 bucket.
    :return: the key to identify the newly created mp3 file in the s3 bucket.`

    console.log('convertpdfmp3')
    try {
        const response = await fetch('https://ws206gr9jh.execute-api.eu-west-2.amazonaws.com/test/convert_pdf_to_audio', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                //'Authorization': tokens['idToken']
            },
            body: JSON.stringify({ "key": key })
        });
        data = await response.json()
        console.log(data)
        dataBodyObj = JSON.parse(data.body)
        key = dataBodyObj.key
        return key
    } catch (error) {
        console.error(error);
    }
}

function loadMp3OnPage(url, filename = "") {
    `loads mp3 audio into the audio player and makes it available via the download button on the webpage.
    :param url: aws presigned url to get the mp3 file from the s3 bucket.
    :param filename: the name of the file`

    console.log('loadmp3')
    audioSource = document.querySelector('#audioSource')
    audioSource.src = url
    document.getElementById('audioPlayer').load()

    downloadButton = document.querySelector('#downloadButton')
    downloadButton.href = url
    downloadButton.download = filename + ".mp3"
}

function loadingSpinner(state) {
    `loads a spinner to signify loading
    :param state: string: either "on" to make the spinner visible or "off" to hide it`

    spinner = document.querySelector('.spinner-border')
    if (state == 'on') {
        spinner.style.visibility = 'visible'
    } else if (state == 'off') {
        spinner.style.visibility = 'hidden'
    }
}

async function saveMp3ToSite(e) {
    `sends a fetch request to a aws api endpoint to invoke a lamdba funcion that saves the key of the mp3 to a database, user must be logged in
    :param e: event listener event from button click`

    e.preventDefault()

    console.log('saveMp3ToSite')
    tokens = getTokens()
    try {
        const response = await fetch('https://ws206gr9jh.execute-api.eu-west-2.amazonaws.com/test/upload_key_to_user_table', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': tokens['idToken']
            },
            body: JSON.stringify({ "mp3Key": "testfrontend", "accessToken": tokens['accessToken'] })
        });
        data = await response.json()
        console.log(data)
    } catch (error) {
        console.log(error)
    }

}


async function loadUserMp3Table() {
    `loads the logged in users saved mp3 files into a table after getting their presigned urls from a aws api endpoint`

    console.log('loadUserMp3Table')

    tableDiv = document.querySelector('#tableDiv')
    tableHTML = `<table class="table table-hover">
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
    tokens = getTokens()
    try {
        const response = await fetch('https://ws206gr9jh.execute-api.eu-west-2.amazonaws.com/test/get_mp3_presigned_urls_for_user', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': tokens['idToken']
            },
            body: JSON.stringify({ "accessToken": tokens['accessToken'] })
        });
        data = await response.json()
        userKeyUrlList = data.body
        console.log(userKeyUrlList)

        userMp3TableBody = document.querySelector('#userMp3TableBody')

        for (let obj of userKeyUrlList) {
            key = obj.mp3Key
            presignedUrl = obj.presignedUrl
            console.log(key)
            console.log(presignedUrl)
            tableRow = document.createElement('tr')
            tableHead = document.createElement('th')
            tableHead.innerHTML = key
            tableRow.appendChild(tableHead)
            tableDataAudio = document.createElement('td')
            audioPlayer = document.createElement('audio')
            audioPlayer.setAttribute('controls', true)
            audioSource = document.createElement('source')
            audioSource.type = "audio/mpeg"
            audioSource.src = presignedUrl
            audioPlayer.appendChild(audioSource)
            tableDataAudio.appendChild(audioPlayer)
            audioPlayer.load()
            //tableDataAudio.innerHTML = 'test'
            tableRow.appendChild(tableDataAudio)
            tableDataButton = document.createElement('td')
            downloadButtonLink = document.createElement('a')
            downloadButtonLink.setAttribute('href', presignedUrl)
            downloadButtonLink.innerHTML = 'Download'
            downloadButtonLink.className += 'btn btn-primary'
            tableDataButton.appendChild(downloadButtonLink)
            tableRow.appendChild(tableDataButton)
            userMp3TableBody.appendChild(tableRow)
        }
    } catch (error) {
        console.log(error)
    }
}

loadUserMp3Table()

function getTokens() {
    url = window.location.href
    //console.log(testurl)
    urlObj = new URL(url)
    //console.log(url.hash)
    tokens = urlObj.hash.split('=')
    idToken = tokens[1].split('&')[0]
    //console.log(idToken)
    accessToken = tokens[2].split('&')[0]
    //console.log(accessToken)
    return { idToken: idToken, accessToken: accessToken }
}