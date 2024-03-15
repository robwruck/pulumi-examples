# Pulumi magic lambda example (AWS SDK v2)

This will create a Pulumi "magic" lambda from the compiled clientLambda.ts 

## Deployment

We won't store any secrets in the Pulumi state, so just set

```bash
export PULUMI_CONFIG_PASSPHRASE="secret"
```

Choose a separate subfolder in the state S3 bucket:

```bash
pulumi login s3://pulumi-<your suffix>/apigateway?region=eu-central-1
pulumi stack init playground
pulumi up -s playground
```
