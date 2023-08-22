import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export type S3NotificationTopicParams = {
    bucketName: pulumi.Output<string>
    bucketArn: pulumi.Output<string>
    regionName: string
    ownerAccountId: string
}

export class S3NotificationTopic extends aws.sns.Topic {

    constructor(name: string, params: S3NotificationTopicParams) {
        const loggingRole = new aws.iam.Role(`${name}LoggingRole`, {
            assumeRolePolicy: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'AllowUsageBySNS',
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'sns.amazonaws.com'
                        }
                    }
                ]
            }
        })

        new aws.iam.RolePolicyAttachment(`${name}LoggingRolePolicy`, {
            role: loggingRole.name,
            policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole
        }, { parent: loggingRole })

        super(name, {
            name: name,
            sqsFailureFeedbackRoleArn: loggingRole.arn,
            sqsSuccessFeedbackRoleArn: loggingRole.arn,
            sqsSuccessFeedbackSampleRate: 100
        })

        // Guess the name of the log groups SNS will create,
        // create it now and set their retention period
        const logGroupSuccess = new aws.cloudwatch.LogGroup(`${name}LogGroupSuccess`, {
            name: `sns/${params.regionName}/${params.ownerAccountId}/${name}`,
            retentionInDays: 14
        }, {
            parent: this
        })

        const logGroupFailure = new aws.cloudwatch.LogGroup(`${name}LogGroupFailure`, {
            name: `sns/${params.regionName}/${params.ownerAccountId}/${name}/Failure`,
            retentionInDays: 14
        }, {
            parent: this
        })

        const snsPolicy = new aws.sns.TopicPolicy(`${name}Policy`, {
            arn: this.arn,
            policy: params.bucketArn.apply((arn) =>
                JSON.stringify({
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Action: 'sns:Publish',
                            Effect: 'Allow',
                            Resource: '*',
                            Principal: {
                                Service: 's3.amazonaws.com'
                            },
                            Condition: {
                                ArnEquals: { 'aws:SourceArn': arn }
                            }
                        }
                    ]
                })
            )
        }, { parent: this })
        
        const bucketNotification = new aws.s3.BucketNotification(`${name}BucketNotification`, {
            bucket: params.bucketName,
            topics: [
                {
                topicArn: this.arn,
                events: ['s3:ObjectCreated:*']
                }
            ]
        }, {
            parent: this,
            dependsOn: snsPolicy
        })
    }
}
