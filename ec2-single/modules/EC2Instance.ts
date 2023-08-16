import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"

export type EC2InstanceParams = {
    instanceProfileName: pulumi.Output<string>,
    subnetId: string,
    securityGroupId: string,
    sshKeyName: string
}

export class EC2Instance extends aws.ec2.Instance {

    public readonly username: string

    constructor(name: string, params: EC2InstanceParams) {
        super(name, {
            ami: "ami-0c4c4bd6cf0c5fe52", // Amazon Linux 2023 AMI 2023.1.20230809.0 x86_64 HVM kernel-6.1
            associatePublicIpAddress: true,
            instanceType: "t2.micro",
            keyName: params.sshKeyName,
            subnetId: params.subnetId,
            vpcSecurityGroupIds: [ params.securityGroupId ],
            iamInstanceProfile: params.instanceProfileName
        })

        this.username = 'ec2-user' // default user for selected AMI
    }
}
