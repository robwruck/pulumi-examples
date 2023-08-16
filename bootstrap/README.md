# Pulumi bootstrap

This will create an S3 bucket used to store Pulumi state for this and other Pulumi projects.

## Deployment

We won't store any secrets in the Pulumi state, so just set

```bash
export PULUMI_CONFIG_PASSPHRASE="secret"
```

Use a local directory to store the initial state:

```bash
pulumi login file://.
pulumi stack init playground
pulumi up -s playground
pulumi stack export -s playground --file playground.stack
```

Switch over to the newly created bucket and import the stack:

```bash
pulumi login s3://pulumi-<your suffix>/bootstrap?region=eu-central-1
pulumi stack init playground
pulumi stack import -s playground --file playground.stack
```

Clean up:

```bash
rm -rf .pulumi playground.stack
```
