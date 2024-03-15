import { ClientLambda, } from "./modules/ClientLambda"

const setupProject = async (): Promise<any> => {

    const lambda = new ClientLambda("example_sdkv3")

    return {
        x86LambdaUrl: lambda.functionUrl
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
