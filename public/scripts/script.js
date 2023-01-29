import { getS3PresignedUrl, uploadToS3, convertPdfToMp3, loadMp3OnPage, loadingSpinner, saveMp3ToSite, loadUserMp3Table, attemptAuthorizeUser, readCookie, setSignInOutLink, deleteUserMp3s, setPageNumbersInPageSelectors, setAvailablePageTo, getPages, showModal } from './functions.js'

let uploadPdfForm = document.querySelector('#pdfForm')
let pdfFile = document.querySelector('#pdfFile')
console.log(uploadPdfForm)
uploadPdfForm.addEventListener('submit', (e) => { uploadPDF(e) })
pdfFile.addEventListener('change', (e) => { setPageNumbersInPageSelectors(e) })

let selectPageFromDrowdown = document.querySelector('#select-page-from')
selectPageFromDrowdown.addEventListener('change', (e) => { setAvailablePageTo(e) })

let deleteButton = document.querySelector('#deleteButton')
deleteButton.addEventListener('click', (e) => { deleteUserMp3s(e) })

let userMp3Modal = document.querySelector('#userMp3ModalButton')
userMp3Modal.addEventListener('click', (e) => { showModal(e) })

console.log(Object.keys(sessionStorage));
console.log(document.cookie)
console.log(window.location.href)
console.log(sessionStorage.getItem('accessToken'))

let authorised = await attemptAuthorizeUser()
if (authorised) {
    setSignInOutLink({ authorised: true })
    let mp3UploadedBeforeSignIn = readCookie({ cookieKey: 'mp3key' })
    if (mp3UploadedBeforeSignIn) {
        let mp3key = readCookie({ cookieKey: 'mp3key' })
        let filename = readCookie({ cookieKey: 'filename' })
        saveMp3ToSite({ key: mp3key, filename: filename })
    }
    //loadUserMp3Table()
} else {
    setSignInOutLink({ authorised: false })
}

async function uploadPDF(e) {
    e.preventDefault()
    console.log('uploadPdf')
    loadingSpinner({ loaded: true })
    let pagesToConvert = getPages()
    console.log(pagesToConvert)

    //get file from form
    let formdata = new FormData(e.target)
    let pdfFile = formdata.get('pdfFile')
    let filename = pdfFile.name.slice(0, pdfFile.name.length - 4)
    //filename = pdfFile.name

    //get url to upload pdf to s3 bucket
    let pdfUploadDataObj = await getS3PresignedUrl({ method: 'PUT', file_type: 'pdf' })

    // upload pdf to s3 bucket
    await uploadToS3({ url: pdfUploadDataObj.presignedUrl, file: pdfFile })
    let start = Date.now()
    // convert the uploaded pdf to mp3
    let mp3Key = await convertPdfToMp3({ key: pdfUploadDataObj.key, pages: pagesToConvert })
    let end = Date.now()
    console.log(end - start)

    loadingSpinner({ loaded: false })

    if (mp3Key) {
        // get url to download the mp3 from s3 bucket
        let mp3DownloadDataObj = await getS3PresignedUrl({ method: 'GET', file_type: 'mp3', key: mp3Key, filename: filename })

        // make mp3 available in audio player and download button
        loadMp3OnPage({ url: mp3DownloadDataObj.presignedUrl, filename: filename, key: mp3Key })
        console.log('test')
        document.cookie = `mp3key=${mp3Key}; path=/; max-age=600`
        document.cookie = `filename=${filename}; path=/; max-age=600`

        saveMp3ToSite({ key: mp3Key, filename: filename })
    }

}

