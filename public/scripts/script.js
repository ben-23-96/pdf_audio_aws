form = document.querySelector('#pdfForm')
console.log(form)
form.addEventListener('submit', (e) => { uploadPDF(e) })

async function uploadPDF(e) {
    e.preventDefault()
    console.log('uploadPdf')

    //get file from form
    formdata = new FormData(e.target)
    pdfFile = formdata.get('pdfFile')
    filename = pdfFile.name.slice(0, pdfFile.name.length - 4)
    console.log(pdfFile)

    //tokens = getTokens()

    // get url to upload pdf to s3 bucket
    pdfUploadDataObj = await getS3PresignedUrl(method = 'PUT', key = 'test1.pdf')

    // upload pdf to s3 bucket
    await uploadToS3(url = pdfUploadDataObj.presignedUrl, file = pdfFile)

    // convert the uploaded pdf to mp3
    mp3Key = await convertPdfToMp3(key = pdfUploadDataObj.key)

    // get url to download the mp3 from s3 bucket
    mp3DownloadDataObj = await getS3PresignedUrl(method = 'GET', key = mp3Key)

    // make mp3 available in audio player and download button
    loadMp3OnPage(url = mp3DownloadDataObj.presignedUrl, filename = filename)

}

async function getS3PresignedUrl(method, key = "") {
    `send a fetch request to aws api endpoint that invokes a lambda function that generates a presigned url to perform action on a s3 bucket
    :param method: the name of the reqest method the url will be used to perform. GET, PUT accepted
    :param key: the key used to identify the object in the s3 bucket, leave blank on put requests and one will be generated
    :return: object containing the presigned url and the objects key in the bucket. keys: presignedUrl, key`

    console.log('getS3PresignedUrl', method, key)

    try {
        const response = await fetch('https://ws206gr9jh.execute-api.eu-west-2.amazonaws.com/test/get_s3_presigned_url', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                //'Authorization': tokens['idToken']
            },
            body: JSON.stringify({ "request_method": method, "key": key })
        });
        data = await response.json()
        console.log(data)
        dataBodyObj = JSON.parse(data.body)
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

//function getTokens() {
//    testurl = ""
//    console.log(testurl)
//    url = new URL(testurl)
//    console.log(url.hash)
//    tokens = url.hash.split('=')
//    idToken = tokens[1].split('&')[0]
//    console.log(idToken)
//    accessToken = tokens[2].split('&')[0]
//    console.log(accessToken)
//    return { idToken: idToken, accessToken: accessToken }
//}