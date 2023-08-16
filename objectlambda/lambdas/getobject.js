console.log('Loading function');

const aws = require('aws-sdk');

const s3 = new aws.S3();

exports.handler = async (event, context) => {
    const bucket = event.bucket || process.env['DEFAULT_BUCKET_NAME']
    const keyToFetch = event.key || process.env['DEFAULT_KEY']

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
