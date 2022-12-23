var url = window.location.hash;

var access_token = new URLSearchParams(url).get('id_token');
console.log(access_token)
console.log(url)

form = document.querySelector('#pdfForm')
console.log(form)
form.addEventListener('submit', (e) => { uploadPDF(e) })

async function uploadPDF(e) {
    e.preventDefault()
    //formdata = new FormData(e.target)
    //console.log(formdata.get('pdfFile'))

    try {
        const response = await fetch('https://ws206gr9jh.execute-api.eu-west-2.amazonaws.com/test/pdfauth', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': access_token
            },
            body: JSON.stringify({ test: 'testing lambda function' })
        });
        resStatus = await response.status;
        console.log(resStatus)
        console.log(response)
        console.log(response.body)
    } catch (error) {
        console.error(error);
    }
}
