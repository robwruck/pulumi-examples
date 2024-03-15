# Pulumi magic lambda example (AWS SDK v3)

This will create a Pulumi "magic" lambda from the compiled clientLambda.ts 

@aws-sdk packages are provided by the Lambda runtime and thus have to be added as devDependencies (they are not brought in by Pulumi as was the case for SDK v2).

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
