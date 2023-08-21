import * as aws from "@pulumi/aws";
import { AssetArchive, FileAsset } from "@pulumi/pulumi/asset";

export type ClientLambdaParams = {
    runtime: string,
    architecture: string,
    memorySize: number,
    timeout: number
}

export class ClientLambda extends aws.lambda.FunctionUrl {

    constructor(name: string, params: ClientLambdaParams) {

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
                    }
                ]
            }
        })

        // Attach predefined AWS policies for SQS and network access
        const policy = new aws.iam.RolePolicyAttachment(`${name}PolicyAttachment`, {
            role: lambdaRole,
            policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole
        }, { parent: lambdaRole })

        const archive = new AssetArchive({
            "index.js": new FileAsset('lambdas/clientLambda.js')
        })

        const lambda = new aws.lambda.Function(`${name}Handler`, {
            description: 'Maintained by Pulumi',
            architectures: [ params.architecture ],
            memorySize: params.memorySize,
            timeout: params.timeout,
            runtime: params.runtime,
            role: lambdaRole.arn,
            code: archive,
            handler: "index.handler",

        }, {
            dependsOn: policy
        })

        super(`${name}Url`, {
            functionName: lambda.name,
            authorizationType: "NONE"
        }, {
            parent: lambda
        })
    }
}
