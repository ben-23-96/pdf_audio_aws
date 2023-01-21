import { getS3PresignedUrl, uploadToS3, convertPdfToMp3, loadMp3OnPage, loadingSpinner, saveMp3ToSite, loadUserMp3Table, attemptAuthorizeUser, readCookie } from './functions.js'

let uploadPdfForm = document.querySelector('#pdfForm')
console.log(uploadPdfForm)
uploadPdfForm.addEventListener('submit', (e) => { uploadPDF(e) })

loadingSpinner({ state: 'off' })

console.log(Object.keys(sessionStorage));
console.log(document.cookie)

let authorised = await attemptAuthorizeUser()
if (authorised) {
    let mp3UploadedBeforeSignIn = readCookie({ cookieKey: 'mp3key' })
    if (mp3UploadedBeforeSignIn) {
        saveMp3ToSite()
    }
    loadUserMp3Table()
}

//document.cookie = `mp3key=testsigninafterupload; path=/; max-age=0`

//loadWebpageElements()

async function uploadPDF(e) {
    e.preventDefault()
    console.log('uploadPdf')
    loadingSpinner('on')

    //get file from form
    let formdata = new FormData(e.target)
    let pdfFile = formdata.get('pdfFile')
    let filename = pdfFile.name.slice(0, pdfFile.name.length - 4)
    //filename = pdfFile.name
    console.log(pdfFile)

    // get url to upload pdf to s3 bucket
    let pdfUploadDataObj = await getS3PresignedUrl({ method: 'PUT', file_type: 'pdf' })

    // upload pdf to s3 bucket
    await uploadToS3({ url: pdfUploadDataObj.presignedUrl, file: pdfFile })

    // convert the uploaded pdf to mp3
    let mp3Key = await convertPdfToMp3({ key: pdfUploadDataObj.key })

    // get url to download the mp3 from s3 bucket
    let mp3DownloadDataObj = await getS3PresignedUrl({ method: 'GET', file_type: 'mp3', key: mp3Key })

    // make mp3 available in audio player and download button
    loadMp3OnPage({ url: mp3DownloadDataObj.presignedUrl, filename: filename })

    loadingSpinner({ state: 'off' })

    document.cookie = `mp3key=${mp3Key}; path=/; max-age=600`

    saveMp3ToSite()
}

