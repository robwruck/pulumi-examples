import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
import { AssetArchive, FileAsset } from '@pulumi/pulumi/asset'

export type ObjectLambdaParams = {
    ownerAccountId: string
    handlerFileName: string
}

export class ObjectLambda extends aws.lambda.Function {

    constructor(name: string, params: ObjectLambdaParams, opts?: pulumi.ComponentResourceOptions) {

        // IAM role for the event handler Lambda
        const lambdaRole = new aws.iam.Role(`${name}Role`, {
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
                ]
            }
        })

        // Attach predefined AWS policies for SQS and network access
        const policy = new aws.iam.RolePolicyAttachment(`${name}PolicyAttachment`, {
            role: lambdaRole,
            policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole
        }, { parent: lambdaRole })

        const dataBaseAccessPolicy = new aws.iam.RolePolicy(`${name}Policy`, {
            role: lambdaRole,
            policy: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Sid: 'AllowWritingS3Response',
                        Effect: "Allow",
                        Action: [
                            "s3-object-lambda:WriteGetObjectResponse"
                        ],
                        Resource: [
                            `arn:aws:s3-object-lambda:*:${params.ownerAccountId}:accesspoint/*`
                        ]
                    }
                ]
            }
        }, { parent: lambdaRole })

        const archive = new AssetArchive({
            "index.js": new FileAsset(params.handlerFileName)
        })

        super(name, {
            name,
            description: 'Maintained by Pulumi',
            role: lambdaRole.arn,
            runtime: 'nodejs16.x',
            code: archive,
            handler: "index.handler"
        })
    }
}
