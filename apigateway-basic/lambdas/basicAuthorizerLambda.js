function createAllowResponse(req, apiKey) {

    console.log("Result: Allow");

    return {
        principalId: "api-user",
        policyDocument: {
            Version: "2012-10-17",
            Statement: [
                {
                    Action: "execute-api:Invoke",
                    Effect: "Allow",
                    Resource: req.methodArn
                }
            ]
        },
        context: {
            version: 42,
            message: 'Hello, World!'
        },
        usageIdentifierKey: apiKey
    };
}

function createDenyResponse(req) {

    console.log("Result: Deny");

    return {
        principalId: "none",
        policyDocument: {
            Version: "2012-10-17",
            Statement: [
                {
                    Action: "execute-api:Invoke",
                    Effect: "Deny",
                    Resource: req.methodArn
                }
            ]
        }
    };
}

exports.handler = async (req) => {

    console.log(req);

    const authHeader = req.headers.Authorization;
    if (!authHeader) {
        return createDenyResponse(req)
    }

    const parts = authHeader.split(/ /);
    if ((parts.length != 2) || (parts[0].toLowerCase() !== 'basic')) {
        return createDenyResponse(req)
    }

    const credentials = Buffer.from(parts[1], 'base64').toString();
    const userAndPassword = credentials.split(/:/);
    if ((userAndPassword.length != 2) || (userAndPassword[0] !== req.requestContext.stage)) {
        return createDenyResponse(req)
    }

    return createAllowResponse(req, userAndPassword[1])
}
