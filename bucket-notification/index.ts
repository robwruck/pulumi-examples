import { S3Bucket } from "./modules/S3Bucket";
import { S3NotificationTopic } from "./modules/S3NotificationTopic";
import { NotificationQueue } from "./modules/NotificationQueue";
import { NotificationConsumer } from "./modules/NotificationConsumer";
import { DuplicateObjectLambda } from "./modules/DuplicateObjectLambda";

const setupProject = async (): Promise<any> => {

    const bucket = new S3Bucket('notification-bucket');
    
    const topic = new S3NotificationTopic('notification-topic', {
        bucketName: bucket.bucket,
        bucketArn: bucket.arn
    })
    
    const queue = new NotificationQueue('notification-queue', {
        topicArn: topic.arn
    })

    const consumer = new NotificationConsumer('notification-consumer', {
        queueArn: queue.arn,
        bucketArn: bucket.arn
    })

    const duplicateObject = new DuplicateObjectLambda('duplicateObject')

    return {
        bucketName: bucket.bucket,
        consumerLambda: consumer.name,
        duplicateObjectLambda: duplicateObject.name
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
