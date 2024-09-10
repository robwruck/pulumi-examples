# Pulumi EC2 single

This will create a single private EC2 instance in the VPC created by default-vpc.

The instance will host a dummy HTTP server that is then made accessible via a private NLB and an API gateway.

## Deployment

We won't store any secrets in the Pulumi state, so just set

```bash
export PULUMI_CONFIG_PASSPHRASE="secret"
```

Choose a separate subfolder in the state S3 bucket:

```bash
pulumi login s3://pulumi-<your suffix>/ec2-apigateway?region=eu-central-1
pulumi stack init playground
pulumi up -s playground
```
