import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"

export type EC2InstanceParams = {
    amiId: string,
    instanceType: string,
    instanceProfileName: pulumi.Output<string>,
    subnetId: string,
    securityGroupId: string,
    sshKeyName: string,
    userData: pulumi.Output<string>
}

export class EC2Instance extends aws.ec2.Instance {

    constructor(name: string, params: EC2InstanceParams) {
        super(name, {
            ami: params.amiId,
            associatePublicIpAddress: true,
            instanceType: params.instanceType,
            keyName: params.sshKeyName,
            subnetId: params.subnetId,
            vpcSecurityGroupIds: [ params.securityGroupId ],
            iamInstanceProfile: params.instanceProfileName,
            userData: params.userData,
            userDataReplaceOnChange: true
        })
    }
}
