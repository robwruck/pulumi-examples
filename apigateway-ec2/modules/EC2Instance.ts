import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"

export type EC2InstanceParams = {
    amiId: string,
    instanceType: string,
    subnetId: string,
    securityGroupId: pulumi.Output<string>,
    sshKeyName: string,
    userData: pulumi.Output<string>
}

export class EC2Instance extends aws.ec2.Instance {

    constructor(name: string, params: EC2InstanceParams) {
        super(name, {
            ami: params.amiId,
            associatePublicIpAddress: false,
            instanceType: params.instanceType,
            keyName: params.sshKeyName,
            subnetId: params.subnetId,
            vpcSecurityGroupIds: [ params.securityGroupId ],
            userData: params.userData,
            userDataReplaceOnChange: true,
            tags: {
                Name: name
            }
        })
    }
}
