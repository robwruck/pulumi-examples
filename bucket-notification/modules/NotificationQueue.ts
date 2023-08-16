import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export type NotificationQueueParams = {
    topicArn: pulumi.Output<string>
}

export class NotificationQueue extends aws.sqs.Queue {

    constructor(name: string, params: NotificationQueueParams) {

        const dlq = new aws.sqs.Queue(`${name}-DLQ`, {
            name: `${name}-DLQ`,
            visibilityTimeoutSeconds: 300,
            messageRetentionSeconds: 86400
        })

        super(name, {
            name: name,
            visibilityTimeoutSeconds: 300,
            redrivePolicy: dlq.arn.apply((arn) =>
                JSON.stringify({
                    deadLetterTargetArn: arn,
                    maxReceiveCount: 3
                })
            )
        })

        const policy = new aws.sqs.QueuePolicy(`${name}-Policy`, {
            queueUrl: this.url,
            policy: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'allow-sns-messages',
                        Action: [
                            'sqs:SendMessage',
                        ],
                        Effect: 'Allow',
                        Resource: '*',
                        Principal: {
                            Service: 'sns.amazonaws.com'
                        },
                        Condition: {
                            ArnEquals: { 'aws:SourceArn': params.topicArn }
                        }
                    }
                ]
            }
        }, { parent: this })

        new aws.sns.TopicSubscription(`${name}-Subscription`, {
            topic: params.topicArn,
            protocol: 'sqs',
            endpoint: this.arn
        }, {
            parent: this,
            dependsOn: policy
        })
    }
}
