exports.handler = async (req) => {

    console.log(req);

    const response = {
        version: 42,
        message: 'Hello, World!'
    };

    return {
        statusCode: 200,
        isBase64Encoded: false,
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(response)
    };
};
