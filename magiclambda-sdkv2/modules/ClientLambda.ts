import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws";
import { handler } from "../lambdas/clientLambda";

export class ClientLambda extends aws.lambda.FunctionUrl {

    constructor(name: string) {

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

        const lambda = new aws.lambda.CallbackFunction(`${name}Handler`, {
            description: 'Maintained by Pulumi',
            runtime: 'nodejs16.x',
            role: lambdaRole.arn,
            callback: handler
        }, {
            dependsOn: policy
        })

        // Guess the name of the log group Lambda will create,
        // create it now and set its retention period
        const logGroup = new aws.cloudwatch.LogGroup(`${name}LogGroup`, {
            name: pulumi.concat('/aws/lambda/', lambda.name),
            retentionInDays: 14
        }, {
            parent: lambda
        })

        super(`${name}Url`, {
            functionName: lambda.name,
            authorizationType: "NONE"
        }, {
            parent: lambda
        })
    }
}
