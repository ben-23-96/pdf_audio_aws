import { CognitoJwtVerifier } from "aws-jwt-verify";

// Verifier that expects valid access tokens:
const verifier = CognitoJwtVerifier.create({
    userPoolId: "eu-west-2_OCDjnmty9",
    tokenUse: "access",
    clientId: "1jdksnkvu02f7qvr5l7j7ichkf",
});

var url = window.location
console.log(url)
var access_token = new URLSearchParams(url.search).get('id_token');
console.log(access_token)

try {
    const payload = await verifier.verify(
        access_token // the JWT as string
    );
    console.log("Token is valid. Payload:", payload);
} catch {
    console.log("Token not valid!");
}

pdfForm = document.querySelector('#pdfForm')
pdfForm.addEventListener('submit', (e) => { uploadPDFToS3(e) })

function uploadPDFToS3(e) {
    e.preventDefault()
    const formdata = new FormData(e.target);
    file = formdata.get('pdfFile')
    console.log(file)
}