# Pulumi API gateway example

This will create a REST API with two endpoints:

* `/s3/*`: Fetch files from an S3 bucket using the request path
* `/lambda/*`: Call a Lambda function and return the result

While the `/s3` endpoint will be publicly accessible, the `/lambda` endpoint requires an API key.

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
