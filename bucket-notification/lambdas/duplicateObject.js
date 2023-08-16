const aws = require('aws-sdk');

const s3 = new aws.S3();

/*
 * Read an object from an S3 bucket and duplicate it
 * a number of times with random names
 */
exports.handler = async (event, context) => {
    if (!event || !event.bucket || !event.key || !event.count) {
        console.error("Please provide { bucket, key, count }");
        return;
    }

    console.log("Creating "+event.count+" copies of "+event.bucket+"/"+event.key);

    const data = await s3.getObject({ Bucket: event.bucket, Key: event.key }).promise();

    for (let i = 0; i < event.count; i++) {
        const key = event.key + "_" + Math.floor(Math.random() * 100000000).toString();
        console.log("Writing S3 object " + key);
        await s3.putObject({ Bucket: event.bucket, Key: key, Body: data.Body }).promise();
    }
};
