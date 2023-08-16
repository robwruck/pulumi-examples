import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"
import * as fs from "fs"
import { PublicS3Bucket } from "./modules/PublicS3Bucket"
import { RestApi } from "./modules/RestApi"
import { ApiGatewayLogging } from "./modules/ApiGatewayLogging"

const setupProject = async (): Promise<any> => {

    const awsConfig = new pulumi.Config('aws')
    const config = new pulumi.Config('vpc')

    const currentIdentity = await aws.getCallerIdentity()

    const logging = new ApiGatewayLogging('apigateway-logging')

    const bucket = new PublicS3Bucket('apigateway-bucket')

    for (const fileName of fs.readdirSync('files')) {
        new aws.s3.BucketObject(fileName, {
            bucket: bucket.bucket,
            key: fileName,
            content: fs.readFileSync(`files/${fileName}`).toString()
        }, { parent: bucket })
    }

    const api = new RestApi("example", {
        stageName: "api",
        regionName: awsConfig.require('region'),
        ownerAccountId: currentIdentity.accountId,
        rateLimit: 1,
        bucketName: bucket.bucket
    }, { dependsOn: logging })

    return {
        apiId: api.id,
        invokeUrl: api.invokeUrl
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
