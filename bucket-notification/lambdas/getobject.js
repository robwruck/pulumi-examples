console.log('Loading function');

const aws = require('aws-sdk');

const s3 = new aws.S3();

exports.handler = async (event, context) => {
    const snsEvent = JSON.parse(event.Records[0].body)
    const s3Event = JSON.parse(snsEvent.Message)
    const s3Notification = s3Event.Records[0].s3

    const bucket = s3Notification.bucket.name
    const keyToFetch = s3Notification.object.key

    if (!bucket || !keyToFetch) {
        return { 'status_code': 400 };
    }

    console.log("Fetching "+keyToFetch+" from "+bucket);

    const data = await s3.getObject({
        Bucket: bucket,
        Key: keyToFetch
    }).promise();
    
    if (!data.Body)
        console.log("Failed to fetch file");
    else
        console.log(data.Body.toString('utf-8'));

    return { 'status_code': 200 };
};
