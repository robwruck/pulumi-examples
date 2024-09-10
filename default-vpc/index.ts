import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"
import { VpcWithSubnets } from "./modules/VpcWithSubnets"
import { SSHKey } from "./modules/SSHKey"

const setupProject = async (): Promise<any> => {

    const name = pulumi.getProject()
    const region = await aws.getRegion()
    const config = new pulumi.Config('vpc')

    const vpc = new VpcWithSubnets(name, {
        region: region.name,
        cidrPrefix: config.require('cidrPrefix'),
        subnetAvailabilityZones: config.requireObject<string[]>('subnetAvailabilityZones')
    })

    const keyPair = new SSHKey(name, {
        publicKeyFile: `keys/${config.require('publicKeyFile')}`
    })

    return {
        vpcId: vpc.id,
        subnetIds: vpc.subnetIds,
        securityGroupId: vpc.securityGroupId
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
