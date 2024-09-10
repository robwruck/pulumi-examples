import * as fs from "fs"
import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"
import { EC2Instance } from "./modules/EC2Instance"
import { VpcLinkRestApi } from "./modules/VpcLinkRestApi";

const setupProject = async (): Promise<any> => {

    const name = pulumi.getProject()
    const config = new pulumi.Config('ec2')

    const subnet = await aws.ec2.getSubnet({
        cidrBlock: config.require('cidrBlock')
    })

    const securityGroup = new aws.ec2.SecurityGroup(`${name}-securitygroup`, {
        vpcId: subnet.vpcId,
        ingress: [
            {
                self: true,
                protocol: "-1",
                fromPort: 0,
                toPort: 0,
                description: "Allow internal traffic"
            },
            {
                cidrBlocks: [ "0.0.0.0/0" ],
                protocol: "TCP",
                fromPort: 22,
                toPort: 22,
                description: "Allow SSH"
            },
            {
                cidrBlocks: [ "0.0.0.0/0" ],
                protocol: "TCP",
                fromPort: 80,
                toPort: 80,
                description: "Allow HTTP"
            }
        ],
        egress: [
            {
                cidrBlocks: [ "0.0.0.0/0" ],
                protocol: "-1",
                fromPort: 0,
                toPort: 0,
                description: "Allow all"
            }
        ],
        tags: {
            Name: `${name}-securitygroup`
        }
    })

    const cloudInitYaml = fs.readFileSync("assets/cloud-init.yaml", "utf-8")

    const instance = new EC2Instance(name, {
        amiId: config.require('amiId'),
        instanceType: config.require('instanceType'),
        subnetId: subnet.id,
        securityGroupId: securityGroup.id,
        sshKeyName: config.require('sshKeyName'),
        userData: pulumi.output(cloudInitYaml)
    })

    const targetGroup = new aws.lb.TargetGroup(`${name}-target`, {
        targetType: "instance",
        protocol: "TCP",
        port: 80,
        vpcId: subnet.vpcId,
        healthCheck: {
            protocol: "HTTP",
            path: "/"
        }
    })

    new aws.lb.TargetGroupAttachment(`${name}-attachment`, {
        targetGroupArn: targetGroup.arn,
        targetId: instance.id,
        port: 80
    }, { parent: targetGroup })

    const loadBalancer = new aws.lb.LoadBalancer(`${name}-nlb`, {
        loadBalancerType: "network",
        internal: true,
        ipAddressType: "ipv4",
        subnets: [
            subnet.id
        ],
        securityGroups: [securityGroup.id]
    })

    new aws.lb.Listener(`${name}-listener`, {
        loadBalancerArn: loadBalancer.arn,
        protocol: "TCP",
        port: 80,
        defaultActions: [
            {
            type: "forward",
            targetGroupArn: targetGroup.arn
            }
        ]
    }, { parent: loadBalancer })

    const api = new VpcLinkRestApi(name, {
        stageName: "api",
        backendNlb: loadBalancer
    })

    return {
        ipAddress: instance.publicIp,
        sshAddress: pulumi.concat(config.require('userName'), "@", instance.publicIp),
        invokeUrl: api.invokeUrl
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
