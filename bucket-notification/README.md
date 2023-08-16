# Pulumi bucket notification example

This will create:

* An S3 bucket
* An SNS topic that will receive notifications about objects created in the bucket
* An SQS queue that will subscribe to the topic
* A Lambda function that will process the SQS messages and read the object contents from S3
* An SQS queue that will act as DLQ if the Lambda function fails
* A Lambda function that can be used to duplicate an S3 object a number of times

## Deployment

We won't store any secrets in the Pulumi state, so just set

```bash
export PULUMI_CONFIG_PASSPHRASE="secret"
```

Choose a separate subfolder in the state S3 bucket:

```bash
pulumi login s3://pulumi-<your suffix>/bucket-notification?region=eu-central-1
pulumi stack init playground
pulumi up -s playground
```
