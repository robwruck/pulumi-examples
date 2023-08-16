# Pulumi default VPC

This will create a VPC with a subnet for each availability zone.
The subnets will have internet access.

For lauchning EC2 instances, a default security group that allows SSH access and an SSH key pair will also be created.
Remember to replace [keys/id_rsa.pub](keys/id_rsa.pub) with a public key for which you own the private key.

## Deployment

We won't store any secrets in the Pulumi state, so just set

```bash
export PULUMI_CONFIG_PASSPHRASE="secret"
```

Choose a separate subfolder in the state S3 bucket:

```bash
pulumi login s3://pulumi-<your suffix>/default-vpc?region=eu-central-1
pulumi stack init playground
pulumi up -s playground
```
