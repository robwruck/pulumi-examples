console.log('Loading function');

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client();

exports.handler = async (event, context) => {
    const bucket = event.bucket || process.env['DEFAULT_BUCKET_NAME']
    const keyToFetch = event.key || process.env['DEFAULT_KEY']

    if (!bucket || !keyToFetch) {
        return { 'status_code': 400 };
    }

    console.log("Fetching "+keyToFetch+" from "+bucket);

    const data = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: keyToFetch
    }));
    
    if (!data.Body)
        console.log("Failed to fetch file");
    else
        console.log(await data.Body.transformToString());

    return { 'status_code': 200 };
};
