import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export type ResourceDescription = {
    name: string
    fullPath: string
    id: pulumi.Output<string>
    parent: pulumi.Resource
}

type ResourceMap = {
    [key: string]: aws.apigateway.Resource
}

/**
 * Creates aws.apigateway.Resource objects for paths, reusing previously created objects
 */
export class ApiGatewayResourceFactory {

    private readonly createdResourcesByName: ResourceMap = {}

    constructor(private readonly name: string, private readonly api: aws.apigateway.RestApi) {
    }

    createResourceForPath(path: string): ResourceDescription {
        let resourceName = this.name
        let fullPath = ''
        let id = this.api.rootResourceId
        let parent: pulumi.Resource = this.api

        const dirs = path.split('/')
        for (let i = 0; i < dirs.length; i++) {
            resourceName += '_'
            if (i > 0) {
                fullPath += '/'
            }
            if (dirs[i].startsWith('{')) {
                resourceName += dirs[i].replace(/[{}+]/g, '')
                fullPath += '*'
            } else {
                resourceName += dirs[i]
                fullPath += dirs[i]
            }

            const childResource = this.findOrCreateResource(resourceName, id, dirs[i], parent)
            parent = childResource
            id = childResource.id
        }

        return { name: resourceName, fullPath, id, parent }
    }

    private findOrCreateResource(name: string, parentId: pulumi.Output<string>, pathPart: string, parent: pulumi.Resource): aws.apigateway.Resource {
        if (!this.createdResourcesByName.hasOwnProperty(name)) {
            const childResource = new aws.apigateway.Resource(`${name}Resource`, {
                restApi: this.api,
                parentId,
                pathPart
            }, { parent })
            this.createdResourcesByName[name] = childResource
        }
        return this.createdResourcesByName[name]
    }

    getMethodArn(regionName: string, ownerAccountId: string, method: aws.apigateway.Method, resource: ResourceDescription): pulumi.Output<string> {
        return pulumi.interpolate`arn:aws:execute-api:${regionName}:${ownerAccountId}:${this.api.id}/*/${method.httpMethod}/${resource.fullPath}`
    }
}
