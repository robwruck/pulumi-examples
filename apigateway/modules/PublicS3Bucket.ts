import * as pulumi from "@pulumi/pulumi"
import * as aws from '@pulumi/aws'
import { ComponentResourceOptions } from '@pulumi/pulumi'

export class PublicS3Bucket extends aws.s3.Bucket {

    constructor(name: string, opts?: ComponentResourceOptions) {
        super(name, {
            // Enable server side encryption using a default key
            serverSideEncryptionConfiguration: {
                rule: {
                    applyServerSideEncryptionByDefault: {
                        sseAlgorithm: "AES256"
                    }
                }
            }
        }, opts)

        // Security: Deny Non-SSL access to the bucket
        new aws.s3.BucketPolicy(`${name}BucketPolicy`, {
            bucket: this.id,
            policy: {
                Id: "ExamplePolicy",
                Version: "2012-10-17",
                Statement: [
                    {
                        Sid: "AllowSSLRequestsOnly",
                        Action: "s3:*",
                        Effect: "Deny",
                        Resource: [
                            this.arn,
                            pulumi.concat(this.arn, "/*")
                        ],
                        Condition: {
                            Bool: {
                                "aws:SecureTransport": "false"
                            }
                        },
                    Principal: "*"
                    }
                ]
            }
        }, { parent: this })

        // Security: Allow objects to be made public
        new aws.s3.BucketPublicAccessBlock(`${name}PublicAccessBlock`, {
            bucket: this.bucket,
            blockPublicAcls: true,
            blockPublicPolicy: true,
            ignorePublicAcls: true,
            restrictPublicBuckets: true
        }, { parent: this })
    }
}
