import * as aws from "@pulumi/aws"
import * as fs from "fs"
import { PublicS3Bucket } from "./modules/PublicS3Bucket"
import { RestApi } from "./modules/RestApi"
import { ApiGatewayLogging } from "./modules/ApiGatewayLogging"
import { BasicAuthRestApi } from "./modules/BasicAuthRestApi"

const setupProject = async (): Promise<any> => {

    const region = await aws.getRegion()
    const currentIdentity = await aws.getCallerIdentity()

    const logging = new ApiGatewayLogging('apigateway-logging')

    const bucket = new PublicS3Bucket('apigateway-bucket')

    for (const fileName of fs.readdirSync('files')) {
        new aws.s3.BucketObject(fileName, {
            bucket: bucket.bucket,
            key: fileName,
            content: fs.readFileSync(`files/${fileName}`, 'utf-8')
        }, { parent: bucket })
    }

    const api = new RestApi("example", {
        stageName: "api",
        regionName: region.name,
        ownerAccountId: currentIdentity.accountId,
        rateLimit: 1,
        bucketName: bucket.bucket
    }, { dependsOn: logging })

    const contentSuccess = fs.readFileSync('pages/success.html', 'utf-8')
    const contentUnauthorized = fs.readFileSync('pages/unauthorized.html', 'utf-8')
    const contentInvalidApiKey = fs.readFileSync('pages/invalid_api_key.html', 'utf-8')
    const contentAccessDenied = fs.readFileSync('pages/access_denied.html', 'utf-8')

    const basicAuthApi = new BasicAuthRestApi("basicExample", {
        stageName: "api",
        regionName: region.name,
        ownerAccountId: currentIdentity.accountId,
        rateLimit: 1,
        contentSuccess,
        contentUnauthorized,
        contentInvalidApiKey,
        contentAccessDenied
    }, { dependsOn: logging })

    return {
        apiId: api.id,
        invokeUrl: api.invokeUrl,
        basicAuthApiId: basicAuthApi.id,
        basicAuthInvokeUrl: basicAuthApi.invokeUrl
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
