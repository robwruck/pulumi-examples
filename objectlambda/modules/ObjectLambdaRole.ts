import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export type ObjectLambdaRoleParams = {
    ownerAccountId: string,
    accessPointArn: pulumi.Output<string>,
    objectLambdaAccessPointArn: pulumi.Output<string>,
    objectLambdaArn: pulumi.Output<string>,
    kmsKeyArn: pulumi.Output<string>
}

export class ObjectLambdaRole extends aws.iam.Role {

    constructor(name: string, params: ObjectLambdaRoleParams, opts?: pulumi.ComponentResourceOptions) {

        // IAM role for the event handler Lambda
        super(name, {
            name,
            assumeRolePolicy: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'AllowUsageByAWSLambda',
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'lambda.amazonaws.com'
                        }
                    },
                    {
                        Sid: 'AllowUsageByAdmins',
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            AWS: `arn:aws:iam::${params.ownerAccountId}:root`
                        },
                        Condition: {
                            StringLike: {
                                "aws:PrincipalArn": [
                                    `arn:aws:iam::${params.ownerAccountId}:role/aws-reserved/sso.amazonaws.com/eu-central-1/AWSReservedSSO_AdministratorAccess_????????????????`,
                                    `arn:aws:iam::${params.ownerAccountId}:role/aws-reserved/sso.amazonaws.com/eu-central-1/AWSReservedSSO_AWSAdministratorAccess_????????????????`
                                ]
                            }
                        }
                    }
                ]
            }
        })

        const dataBaseAccessPolicy = new aws.iam.RolePolicy(`${name}Policy`, {
            role: this,
            policy: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Action: "s3:ListBucket",
                        Resource: params.accessPointArn,
                        Condition: {
                            "ForAnyValue:StringEquals": {
                                "aws:CalledVia": "s3-object-lambda.amazonaws.com"
                            }
                        }
                    },
                    {
                        Effect: "Allow",
                        Action: "s3:GetObject",
                        Resource: pulumi.concat(params.accessPointArn, "/*"),
                        Condition: {
                            "ForAnyValue:StringEquals": {
                                "aws:CalledVia": "s3-object-lambda.amazonaws.com"
                            }
                        }
                    },
                    {
                        Effect: "Allow",
                        Action: "s3-object-lambda:ListBucket",
                        Resource: params.objectLambdaAccessPointArn
                    },
                    {
                        Effect: "Allow",
                        Action: "s3-object-lambda:GetObject",
                        Resource: params.objectLambdaAccessPointArn
                    },
                    {
                        Effect: "Allow",
                        Action: "lambda:InvokeFunction",
                        Resource: params.objectLambdaArn
                    },
                    {
                        Effect: "Allow",
                        Action: "kms:Decrypt",
                        Resource: params.kmsKeyArn
                    }                ]
            }
        }, { parent: this })

        const policy = new aws.iam.RolePolicyAttachment(`${name}PolicyAttachment`, {
            role: this,
            policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole
        }, { parent: this })
    }
}
