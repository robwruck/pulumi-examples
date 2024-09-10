import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"
import * as fs from "fs"
import { BasicAuthRestApi } from "./modules/BasicAuthRestApi"

const setupProject = async (): Promise<any> => {

    const name = pulumi.getProject()
    const region = await aws.getRegion()
    const currentIdentity = await aws.getCallerIdentity()

    const contentSuccess = fs.readFileSync('pages/success.html', 'utf-8')
    const contentUnauthorized = fs.readFileSync('pages/unauthorized.html', 'utf-8')
    const contentInvalidApiKey = fs.readFileSync('pages/invalid_api_key.html', 'utf-8')
    const contentAccessDenied = fs.readFileSync('pages/access_denied.html', 'utf-8')

    const basicAuthApi = new BasicAuthRestApi(name, {
        stageName: "api",
        regionName: region.name,
        ownerAccountId: currentIdentity.accountId,
        rateLimit: 1,
        contentSuccess,
        contentUnauthorized,
        contentInvalidApiKey,
        contentAccessDenied
    })

    return {
        apiId: basicAuthApi.id,
        invokeUrl: basicAuthApi.invokeUrl,
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
