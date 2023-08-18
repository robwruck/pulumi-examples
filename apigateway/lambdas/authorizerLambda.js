function createAllowResponse(req) {

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
        usageIdentifierKey: req.requestContext.identity.apiKey
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

    const apiKey = req.requestContext.identity.apiKey
    if (apiKey) {
        return createAllowResponse(req)
    } else {
        return createDenyResponse(req)
    }
}
