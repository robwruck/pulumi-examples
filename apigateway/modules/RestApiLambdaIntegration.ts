import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ResourceDescription } from "./ApiGatewayResourceFactory";

export type RestApiLambdaIntegrationParams = {
    restApi: aws.apigateway.RestApi,
    resource: ResourceDescription,
    lambdaFunction: aws.lambda.Function,
    apiKeyRequired: boolean,
    authorizer?: aws.apigateway.Authorizer
    regionName: string,
    ownerAccountId: string
}

export class RestApiLambdaIntegration extends aws.apigateway.Integration {

    constructor(name: string, params: RestApiLambdaIntegrationParams, opts?: pulumi.ComponentResourceOptions) {

        const method = new aws.apigateway.Method(`${name}GET`, {
            restApi: params.restApi,
            resourceId: params.resource.id,
            httpMethod: "GET",
            apiKeyRequired: params.apiKeyRequired,
            authorization: params.authorizer ? "CUSTOM" : "NONE",
            authorizerId: params.authorizer?.id
        }, opts)
        
        const methodResponse = new aws.apigateway.MethodResponse(`${name}GETResponse`, {
            restApi: params.restApi,
            resourceId: method.resourceId,
            httpMethod: method.httpMethod,
            statusCode: "200",
            responseModels: {
                "application/json": 'Empty'
            }
        }, { parent: method })

        const permission = new aws.lambda.Permission(`${name}HandlerPermission`, {
            function: params.lambdaFunction,
            action: "lambda:InvokeFunction",
            principal: "apigateway.amazonaws.com",
            sourceArn: RestApiLambdaIntegration.getMethodSourceArn(params.regionName, params.ownerAccountId, method, params.resource)
        }, { parent: method })

        super(`${name}Integration`, {
            restApi: params.restApi,
            resourceId: method.resourceId,
            httpMethod: method.httpMethod,
            type: "AWS_PROXY",
            integrationHttpMethod: "POST",
            uri: params.lambdaFunction.invokeArn
        }, {
            parent: method,
            dependsOn: permission
        })
    }

    private static getMethodSourceArn(regionName: string, ownerAccountId: string, method: aws.apigateway.Method, resource: ResourceDescription): pulumi.Output<string> {
        return pulumi.interpolate`arn:aws:execute-api:${regionName}:${ownerAccountId}:${method.restApi}/*/${method.httpMethod}/${resource.fullPath}`
    }
}
