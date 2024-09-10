import * as pulumi from "@pulumi/pulumi"
import { ClientLambda, } from "./modules/ClientLambda"

const setupProject = async (): Promise<any> => {

    const name = pulumi.getProject()
    const lambda = new ClientLambda(name)

    return {
        x86LambdaUrl: lambda.functionUrl
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
