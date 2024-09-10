import * as fs from "fs"
import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"
import { EC2Instance } from "./modules/EC2Instance"
import { EC2Role } from "./modules/EC2Role"

const setupProject = async (): Promise<any> => {

    const name = pulumi.getProject()
    const region = await aws.getRegion()
    const config = new pulumi.Config('ec2')

    const subnet = await aws.ec2.getSubnet({
        cidrBlock: config.require('cidrBlock')
    })

    const securityGroup = await aws.ec2.getSecurityGroup({
        name: config.require('securityGroupName')
    })

    const logGroup = new aws.cloudwatch.LogGroup(`${name}-syslog`, {
        retentionInDays: 7
    })

    const profile = new EC2Role(name, {
        logGroupArn: logGroup.arn
    })

    const cloudInitYaml = fs.readFileSync("assets/cloud-init.yaml", "utf-8")
        .replace(/REGION_NAME/g, region.name)

    const userData = logGroup.name.apply(logGroupName =>
        cloudInitYaml.replace('LOG_GROUP_NAME', logGroupName)
    )

    const instance = new EC2Instance(name, {
        amiId: config.require('amiId'),
        instanceType: config.require('instanceType'),
        subnetId: subnet.id,
        securityGroupId: securityGroup.id,
        sshKeyName: config.require('sshKeyName'),
        instanceProfileName: profile.name,
        userData
    })

    return {
        ipAddress: instance.publicIp,
        sshAddress: pulumi.concat(config.require('userName'), "@", instance.publicIp)
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
