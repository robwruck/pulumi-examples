# Pulumi object lambda example

This will create an S3 bucket with some files in it.

For direct access, an IAM role and lambda functions that get objects from the bucket are created.

For access via an S3 access point, an IAM role and lambda functions that get objects from the access point are created.

For access via an S3 object lambda, an IAM role and lambda functions that get objects from the access point are created.

Each lambda function will be created in two versions, one using AWS SDK v2 and one using v3.

## Deployment

We won't store any secrets in the Pulumi state, so just set

```bash
export PULUMI_CONFIG_PASSPHRASE="secret"
```

Choose a separate subfolder in the state S3 bucket:

```bash
pulumi login s3://pulumi-<your suffix>/objectlambda?region=eu-central-1
pulumi stack init playground
pulumi up -s playground
```
