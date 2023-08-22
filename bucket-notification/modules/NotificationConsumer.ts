import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
import { AssetArchive, FileAsset } from '@pulumi/pulumi/asset'

export type NotificationConsumerParams = {
    bucketArn: pulumi.Output<string>,
    queueArn: pulumi.Output<string>
}

export class NotificationConsumer extends aws.lambda.Function {

    constructor(name: string, params: NotificationConsumerParams) {

        const consumerRole = new aws.iam.Role(`${name}-Role`, {
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Action: "sts:AssumeRole",
                    Effect: "Allow",
                    Principal: {
                        Service: "lambda.amazonaws.com"
                    }
                }]
            })
        })
    
        const policy0 = new aws.iam.RolePolicy(`${name}-RolePolicy0`, {
            role: consumerRole.name,
            policy: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: "AllowDataOceanBucketAccess",
                        Action: [
                            's3:GetObject',
                            's3:ListBucket'
                        ],
                        Effect: 'Allow',
                        Resource: [
                            params.bucketArn,
                            pulumi.concat(params.bucketArn, "/*")
                        ]
                    },
                    {
                        Sid: "AllowQueueAccess",
                        Action: [
                            'sqs:ReceiveMessage',
                            'sqs:DeleteMessage',
                            'sqs:GetQueueUrl',
                            'sqs:GetQueueAttributes'
                        ],
                        Effect: 'Allow',
                        Resource: [
                            params.queueArn
                        ]
                    }
                ]
            }
        }, { parent: consumerRole })
    
        const policy1 = new aws.iam.RolePolicyAttachment(`${name}-RolePolicy1`, {
            role: consumerRole.name,
            policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole
        }, { parent: consumerRole })
    
        const archive = new AssetArchive({
            "index.js": new FileAsset("lambdas/getobject.js")
        })

        super(name, {
            name,
            description: 'Maintained by Pulumi',
            role: consumerRole.arn,
            runtime: 'nodejs16.x',
            code: archive,
            handler: "index.handler"
        })

        // Guess the name of the log group Lambda will create,
        // create it now and set its retention period
        const logGroup = new aws.cloudwatch.LogGroup(`${name}LogGroup`, {
            name: pulumi.concat('/aws/lambda/', this.name),
            retentionInDays: 14
        }, {
            parent: this
        })

        const handlerPermission = new aws.lambda.Permission(`${name}-Permission`, {
            function: this.name,
            action: 'lambda:InvokeFunction',
            principal: 'sqs.amazonaws.com',
            sourceArn: params.queueArn
        }, { parent: this })
        
        new aws.lambda.EventSourceMapping(`${name}-EventSourceMapping`, {
            functionName: this.name,
            eventSourceArn: params.queueArn
        }, { parent: this })
    }
}
