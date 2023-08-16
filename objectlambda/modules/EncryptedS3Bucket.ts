import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export type EncryptedS3BucketParams = {
    ownerAccountId: string,
    kmsKeyId: pulumi.Output<string>
}

export class EncryptedS3Bucket extends aws.s3.Bucket {

    constructor(name: string, params: EncryptedS3BucketParams, opts?: pulumi.ComponentResourceOptions) {
        super(name, {
            // Use fixed name only if access needs to be granted
            //bucket: name,
            // Enable server side encryption using a default key
            serverSideEncryptionConfiguration: {
                rule: {
                    bucketKeyEnabled: true,
                    applyServerSideEncryptionByDefault: {
                        sseAlgorithm: 'aws:kms',
                        kmsMasterKeyId: params.kmsKeyId
                    }
                }
            },
            requestPayer: 'Requester'
        }, opts)

/*        new aws.s3.BucketOwnershipControls(`${name}Ownership`, {
            bucket: this.bucket,
            rule: {
                objectOwnership: 'BucketOwnerEnforced'
            }
        }, { parent: this })*/

        const bucketPolicy = new aws.s3.BucketPolicy(`${name}BucketPolicy`, {
            bucket: this.bucket,
            policy: {
                Id: 'ExamplePolicy',
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'Deny Non-SSL requests to the bucket',
                        Action: 's3:*',
                        Effect: 'Deny',
                        Resource: [
                            this.arn,
                            pulumi.concat(this.arn, '/*')
                        ],
                        Principal: '*',
                        Condition: {
                            Bool: {
                                'aws:SecureTransport': 'false',
                            }
                        }
                    },
                    {
                        Sid: "Allow access through any access point",
                        Action: "s3:*",
                        Effect: "Allow",
                        Resource: [
                            this.arn,
                            pulumi.concat(this.arn, '/*')
                        ],
                        Principal: {
                            AWS: "*"
                        },
                        Condition: {
                            StringEquals: {
                                "s3:DataAccessPointAccount": params.ownerAccountId
                            }
                        }
                    }
                ]
            }
        }, { parent: this })

        // Security: Don't allow objects to be made public
        new aws.s3.BucketPublicAccessBlock(`${name}PublicAccessBlock`, {
            bucket: this.bucket,
            blockPublicAcls: true,
            blockPublicPolicy: true,
            ignorePublicAcls: true,
            restrictPublicBuckets: true
        }, {
            parent: this,
            dependsOn: bucketPolicy
        })
    }
}
