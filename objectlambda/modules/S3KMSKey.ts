import * as aws from '@pulumi/aws'
import { ComponentResourceOptions } from '@pulumi/pulumi'

export type S3KMSKeyParams = {
    ownerAccountId: string
}

export class S3KMSKey extends aws.kms.Key {

    constructor(name: string, params: S3KMSKeyParams, opts?: ComponentResourceOptions) {
        super(name, {
            customerMasterKeySpec: 'SYMMETRIC_DEFAULT',
            deletionWindowInDays: 10,
            description: 'Managed by Pulumi',
            policy: JSON.stringify({
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'Apply IAM User Permissions only',
                        Action: [
                            'kms:*'
                        ],
                        Effect: 'Allow',
                        Resource: '*',
                        Principal: {
                            AWS: `arn:aws:iam::${params.ownerAccountId}:root`
                        }
                    }
                ]
            })
        }, opts)

        new aws.kms.Alias(name, {
            name: `alias/${name}`,
            targetKeyId: this.keyId
        }, { parent: this })
    }
}
