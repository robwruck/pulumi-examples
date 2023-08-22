import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
import { AssetArchive, FileAsset } from '@pulumi/pulumi/asset'

export type S3ReaderLambdaParams = {
    roleArn: pulumi.Output<string>,
    handlerFileName: string,
    bucketName: pulumi.Output<string>,
    runtime: string
}

export class S3ReaderLambda extends aws.lambda.Function {

    constructor(name: string, params: S3ReaderLambdaParams, opts?: pulumi.ComponentResourceOptions) {

        const archive = new AssetArchive({
            "index.js": new FileAsset(params.handlerFileName)
        })

        super(name, {
            name,
            description: 'Maintained by Pulumi',
            role: params.roleArn,
            runtime: params.runtime,
            code: archive,
            handler: "index.handler",
            environment: {
                variables: {
                    DEFAULT_BUCKET_NAME: params.bucketName,
                    DEFAULT_KEY: "hello.txt"
                }
            }
        })

        // Guess the name of the log group Lambda will create,
        // create it now and set its retention period
        const logGroup = new aws.cloudwatch.LogGroup(`${name}LogGroup`, {
            name: pulumi.concat('/aws/lambda/', this.name),
            retentionInDays: 14
        }, {
            parent: this
        })
    }
}
