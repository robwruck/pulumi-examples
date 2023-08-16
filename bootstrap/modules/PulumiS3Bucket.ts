import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi"

export class PulumiS3Bucket extends aws.s3.Bucket {

    constructor(name: string) {
        super(name, {
            // Enable server side encryption using a default key
            serverSideEncryptionConfiguration: {
                rule: {
                    applyServerSideEncryptionByDefault: {
                        sseAlgorithm: "AES256"
                    }
                }
            }
        })

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

        // Security: Don't allow objects to be made public
        new aws.s3.BucketPublicAccessBlock(`${name}PublicAccessBlock`, {
            bucket: this.id,
            blockPublicAcls: true,
            blockPublicPolicy: true,
            ignorePublicAcls: true,
            restrictPublicBuckets: true
        }, { parent: this })
    }
}
