import * as aws from "@pulumi/aws"
import * as fs from "fs"
import { S3KMSKey } from "./modules/S3KMSKey"
import { EncryptedS3Bucket } from "./modules/EncryptedS3Bucket"
import { AccessPoint } from "@pulumi/aws/s3"
import { ObjectLambdaAccessPoint } from "@pulumi/aws/s3control"
import { ObjectLambda } from "./modules/ObjectLambda"
import { ObjectLambdaRole } from "./modules/ObjectLambdaRole"
import { AccessPointRole } from "./modules/AccessPointRole"
import { S3AccessRole } from "./modules/S3AccessRole"
import { S3ReaderLambda } from "./modules/S3ReaderLambda"

const setupProject = async (): Promise<any> => {

    const currentIdentity = await aws.getCallerIdentity()

    // Create a custom KMS key
    const key = new S3KMSKey('objectlambda-kms-key', {
        ownerAccountId: currentIdentity.accountId
    })

    // Create the S3 bucket populated with some test files,
    // a role for bucket access and example reader lambdas
    const bucket = new EncryptedS3Bucket('objectlambda-bucket', {
        ownerAccountId: currentIdentity.accountId,
        kmsKeyId: key.keyId
    })

    for (const fileName of fs.readdirSync('files')) {
        new aws.s3.BucketObject(fileName, {
            bucket: bucket.bucket,
            key: fileName,
            content: fs.readFileSync(`files/${fileName}`).toString()
        }, { parent: bucket })
    }

    const bucketRole = new S3AccessRole('objectlambda-bucket-role', {
        ownerAccountId: currentIdentity.accountId,
        bucketArn: bucket.arn,
        kmsKeyArn: key.arn
    })

    const bucketReader = new S3ReaderLambda('objectlambda-bucket-reader', {
        roleArn: bucketRole.arn,
        runtime: 'nodejs16.x',
        handlerFileName: 'lambda/getobject.js',
        bucketName: bucket.bucket
    })
    const bucketReaderV3 = new S3ReaderLambda('objectlambda-bucket-reader-v3', {
        roleArn: bucketRole.arn,
        runtime: 'nodejs18.x',
        handlerFileName: 'lambda/getobjectV3.js',
        bucketName: bucket.bucket
    })

    // Now create an S3 access point,
    // a role for access and example reader lambdas.
    // The role will *not* be able to access the bucket directly.
    const accessPoint = new AccessPoint('objectlambda-ap', {
        bucket: bucket.bucket,
        name: 'objectlambda-ap',
        publicAccessBlockConfiguration: {
            blockPublicAcls: true,
            blockPublicPolicy: true,
            ignorePublicAcls: true,
            restrictPublicBuckets: true
        }
    })

    const accessPointRole = new AccessPointRole('objectlambda-ap-role', {
        ownerAccountId: currentIdentity.accountId,
        accessPointArn: accessPoint.arn,
        kmsKeyArn: key.arn
    })

    const accessPointReader = new S3ReaderLambda('objectlambda-ap-reader', {
        roleArn: accessPointRole.arn,
        runtime: 'nodejs16.x',
        handlerFileName: 'lambda/getobject.js',
        bucketName: accessPoint.arn
    })
    const accessPointReaderV3 = new S3ReaderLambda('objectlambda-ap-reader-v3', {
        roleArn: accessPointRole.arn,
        runtime: 'nodejs18.x',
        handlerFileName: 'lambda/getobjectV3.js',
        bucketName: accessPoint.arn
    })

    // Now create an S3 object lambda access point,
    // a role for access and example reader lambdas.
    // The role will *not* be able to access the bucket directly.
    const lambdaFunction = new ObjectLambda('objectlambda-xform', {
        ownerAccountId: currentIdentity.accountId,
        handlerFileName: "lambdas/xform.js"
    })

    const lambdaAccessPoint = new ObjectLambdaAccessPoint('objectlambda-olap', {
        name: 'objectlambda-olap',
        configuration: {
            supportingAccessPoint: accessPoint.arn,
            transformationConfigurations: [
                {
                    actions: [ "GetObject" ],
                    contentTransformation: {
                        awsLambda: {
                            functionArn: lambdaFunction.arn
                        }
                    }
                }
            ]
        }
    })

    const objectLambdaRole = new ObjectLambdaRole('objectlambda-access-role', {
        ownerAccountId: currentIdentity.accountId,
        accessPointArn: accessPoint.arn,
        objectLambdaAccessPointArn: lambdaAccessPoint.arn,
        objectLambdaArn: lambdaFunction.arn,
        kmsKeyArn: key.arn
    })

    const objectLambdaReader = new S3ReaderLambda('objectlambda-reader', {
        roleArn: objectLambdaRole.arn,
        runtime: 'nodejs16.x',
        handlerFileName: 'lambdas/getobject.js',
        bucketName: lambdaAccessPoint.arn
    })
    const objectLambdaReaderV3 = new S3ReaderLambda('objectlambda-reader-v3', {
        roleArn: objectLambdaRole.arn,
        runtime: 'nodejs18.x',
        handlerFileName: 'lambdas/getobjectV3.js',
        bucketName: lambdaAccessPoint.arn
    })

    return {
        bucketName: bucket.bucket,
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
