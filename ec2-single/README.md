# Pulumi EC2 single

This will create a single EC2 instance in the VPC created by default-vpc.

The instance will be associated with an IAM role that grants permission to perform an `aws s3 ls`.

Syslog messages will be sent to 

## Deployment

We won't store any secrets in the Pulumi state, so just set

```bash
export PULUMI_CONFIG_PASSPHRASE="secret"
```

Choose a separate subfolder in the state S3 bucket:

```bash
pulumi login s3://pulumi-<your suffix>/ec2-single?region=eu-central-1
pulumi stack init playground
pulumi up -s playground
```
