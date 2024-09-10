import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ResourceDescription } from "./ApiGatewayResourceFactory";

export type RestApiMockIntegrationParams = {
    restApi: aws.apigateway.RestApi,
    resource: ResourceDescription,
    content: string,
    apiKeyRequired: boolean,
    authorizer?: aws.apigateway.Authorizer
}

export class RestApiMockIntegration extends aws.apigateway.IntegrationResponse {

    constructor(name: string, params: RestApiMockIntegrationParams, opts?: pulumi.ComponentResourceOptions) {

        const method = new aws.apigateway.Method(`${name}GET`, {
            restApi: params.restApi,
            resourceId: params.resource.id,
            httpMethod: "GET",
            authorization: params.authorizer ? "CUSTOM": "NONE",
            authorizerId: params.authorizer?.id,
            apiKeyRequired: params.apiKeyRequired
        }, opts)
    
        const methodResponse = new aws.apigateway.MethodResponse(`${name}GETResponse`, {
            restApi: params.restApi,
            resourceId: method.resourceId,
            httpMethod: method.httpMethod,
            statusCode: "200",
            responseModels: {
                "text/html": "Empty"
            }
        }, { parent: method })
    
        const integration = new aws.apigateway.Integration(`${name}Integration`, {
            restApi: params.restApi,
            resourceId: method.resourceId,
            httpMethod: method.httpMethod,
            type: "MOCK",
            requestTemplates: {
                "application/json": JSON.stringify({ statusCode: 200 })
            },
            passthroughBehavior: "NEVER"
        }, {
            parent: method
        })

        super(`${name}IntegrationResponse`, {
            restApi: params.restApi,
            resourceId: integration.resourceId,
            httpMethod: integration.httpMethod,
            statusCode: "200",
            responseTemplates: {
                "text/html": params.content
            }
        }, {
            parent: integration
        })
    }
}
