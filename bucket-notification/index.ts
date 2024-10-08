import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"
import { S3Bucket } from "./modules/S3Bucket";
import { S3NotificationTopic } from "./modules/S3NotificationTopic";
import { NotificationQueue } from "./modules/NotificationQueue";
import { NotificationConsumer } from "./modules/NotificationConsumer";
import { DuplicateObjectLambda } from "./modules/DuplicateObjectLambda";

const setupProject = async (): Promise<any> => {

    const name = pulumi.getProject()
    const region = await aws.getRegion()
    const currentIdentity = await aws.getCallerIdentity()

    const bucket = new S3Bucket(`${name}-bucket`);
    
    const topic = new S3NotificationTopic(`${name}-topic`, {
        bucketName: bucket.bucket,
        bucketArn: bucket.arn,
        regionName: region.name,
        ownerAccountId: currentIdentity.accountId,
    })
    
    const queue = new NotificationQueue(`${name}-queue`, {
        topicArn: topic.arn
    })

    const consumer = new NotificationConsumer(`${name}-consumer`, {
        queueArn: queue.arn,
        bucketArn: bucket.arn
    })

    const duplicateObject = new DuplicateObjectLambda(`${name}-duplicateObject`)

    return {
        bucketName: bucket.bucket,
        consumerLambda: consumer.name,
        duplicateObjectLambda: duplicateObject.name
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
