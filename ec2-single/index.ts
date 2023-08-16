import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"
import { EC2Instance } from "./modules/EC2Instance"
import { EC2Role } from "./modules/EC2Role"

const setupProject = async (): Promise<any> => {

    const config = new pulumi.Config('ec2')

    const subnet = await aws.ec2.getSubnet({
        cidrBlock: config.require('cidrBlock')
    })

    const securityGroup = await aws.ec2.getSecurityGroup({
        name: config.require('securityGroupName')
    })

    const profile = new EC2Role("s3")

    const instance = new EC2Instance("single", {
        subnetId: subnet.id,
        securityGroupId: securityGroup.id,
        sshKeyName: config.require('sshKeyName'),
        instanceProfileName: profile.name
    })

    return {
        ipAddress: instance.publicIp,
        sshAddress: pulumi.concat(instance.username, "@", instance.publicIp)
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
