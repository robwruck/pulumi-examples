import * as aws from "@pulumi/aws"
import * as fs from "fs"

export type SSHKeyParams = {
    publicKeyFile: string,
}

export class SSHKey extends aws.ec2.KeyPair {

    constructor(name: string, params: SSHKeyParams) {

        const publicKey = fs.readFileSync(params.publicKeyFile).toString()

        super(name, {
            publicKey,
            keyName: name
        })
    }
}
