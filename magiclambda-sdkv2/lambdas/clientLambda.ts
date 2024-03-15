import * as aws from 'aws-sdk'

export async function handler(): Promise<any> {

    const sts = new aws.STS()
    const result = await sts.getCallerIdentity().promise()
    console.log(result)

    return result
}
