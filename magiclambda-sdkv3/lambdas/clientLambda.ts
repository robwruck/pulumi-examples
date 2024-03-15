import * as sts from '@aws-sdk/client-sts'

export async function handler(): Promise<any> {

    const stsClient = new sts.STS()
    const result = await stsClient.getCallerIdentity({})
    console.log(result)

    return result
}
