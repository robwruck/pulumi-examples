const signatureV4 = require('@aws-sdk/signature-v4');
const sjs = require('@aws-sdk/hash-node');

exports.handler = async (event) => {
    
    const apiUrl = new URL(process.env.API_URL);

    const sigv4 = new signatureV4.SignatureV4({
        service: 'execute-api',
        region: 'eu-central-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN,
        },
        sha256: sjs.Hash.bind(null, "sha256")
    });
    
    const signed = await sigv4.sign({
        method: 'GET',
        hostname: apiUrl.host,
        path: apiUrl.pathname,
        protocol: apiUrl.protocol,
        headers: {
            'host': apiUrl.hostname // compulsory
        },
    });

    console.log(signed);

    const result = await fetch(apiUrl, {
        headers: signed.headers
    });

    const response = {
        statusCode: 200,
        body: await result.json()
    };
    
    return response;
};
