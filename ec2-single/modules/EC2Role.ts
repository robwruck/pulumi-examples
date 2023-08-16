import * as aws from "@pulumi/aws"

export class EC2Role extends aws.iam.InstanceProfile {

    constructor(name: string) {

        const role = new aws.iam.Role(`${name}Role`, {
            assumeRolePolicy: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'AllowUsageByAWSEC2',
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'ec2.amazonaws.com'
                        }
                    }
                ]
            }
        })

        new aws.iam.RolePolicy(`${name}RolePolicy`, {
            role: role.name,
            policy: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Action: "s3:ListAllMyBuckets",
                        Resource: '*'
                    }
                ]
            }
        }, { parent: role })

        super(`${name}Profile`, {
            role: role.name
        })
    }
}
