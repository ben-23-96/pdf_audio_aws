pdfForm = document.querySelector('#pdfForm')
pdfForm.addEventListener('submit', (e) => { uploadPDFToS3(e) })

function uploadPDFToS3(e) {
    e.preventDefault()
    const formdata = new FormData(e.target);
    file = formdata.get('pdfFile')
    console.log(file)
}