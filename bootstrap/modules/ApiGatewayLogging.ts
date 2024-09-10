import * as aws from '@pulumi/aws'
import { ComponentResourceOptions } from '@pulumi/pulumi'

export class ApiGatewayLogging extends aws.apigateway.Account {

    constructor(name: string, opts?: ComponentResourceOptions) {
        // IAM role for sending API gateway access logs to CloudWatch
        const loggingRole = new aws.iam.Role(`${name}LoggingRole`, {
            assumeRolePolicy: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'AllowUsageByApiGateway',
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'apigateway.amazonaws.com'
                        }
                    }
                ]
            }
        })

        // Attach predefined AWS policies for SQS and network access
        const attachment = new aws.iam.RolePolicyAttachment(`${name}Basic`, {
            role: loggingRole,
            policyArn: aws.iam.ManagedPolicies.AmazonAPIGatewayPushToCloudWatchLogs
        }, { parent: loggingRole })

        // The Account is used to configure the ApiGateway (all the current AWS account) to use the loggingRole (to push logs to Cloudwatch)
        super(name, {
            cloudwatchRoleArn: loggingRole.arn
        }, { dependsOn: attachment })
    }
}
