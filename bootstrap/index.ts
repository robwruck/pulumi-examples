import { PulumiS3Bucket } from "./modules/PulumiS3Bucket"

const setupProject = async (): Promise<any> => {

    // Create an S3 bucket for storing the Pulumi stacks
    const bucket = new PulumiS3Bucket("pulumi")

    return {
        bucketName: bucket.bucket,
    }
}

// enable usage of await by running in an anonymous async function
export const outputs = setupProject()
