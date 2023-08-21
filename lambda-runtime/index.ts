import * as pulumi from "@pulumi/pulumi"
import { ClientLambda, } from "./modules/ClientLambda"

const setupProject = async (): Promise<any> => {

    const awsConfig = new pulumi.Config('aws')

    const x86 = new ClientLambda("example_x86", {
        runtime: 'nodejs18.x',
        architecture: "x86_64",
        memorySize: 128,
        timeout: 300
    })

    const arm = new ClientLambda("example_arm", {
        runtime: 'nodejs18.x',
        architecture: "arm64",
        memorySize: 128,
        timeout: 300
    })

    return {
        x86LambdaUrl: x86.functionUrl,
        armLambdaUrl: arm.functionUrl
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
