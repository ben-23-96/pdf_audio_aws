var url = window.location
console.log(url)
var access_token = new URLSearchParams(url.search).get('id_token');
console.log(access_token)

try {
    const response = await fetch('https://ws206gr9jh.execute-api.eu-west-2.amazonaws.com/test/pdf', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: `{
            "test": 'successful lambda progress'
        }`
    });
    resStatus = await response.status;
    console.log(resStatus)
    console.log(response)
} catch (error) {
    console.error(error);
}