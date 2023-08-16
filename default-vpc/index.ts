import * as pulumi from "@pulumi/pulumi"
import { VpcWithSubnets } from "./modules/VpcWithSubnets"
import { SSHKey } from "./modules/SSHKey"

const setupProject = async (): Promise<any> => {

    const awsConfig = new pulumi.Config('aws')
    const config = new pulumi.Config('vpc')

    const vpc = new VpcWithSubnets("main", {
        region: awsConfig.require('region'),
        cidrPrefix: config.require('cidrPrefix'),
        subnetAvailabilityZones: config.requireObject<string[]>('subnetAvailabilityZones'),
        internetAccess: config.requireBoolean('internetAccess')
    })

    const keyPair = new SSHKey("main", {
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
