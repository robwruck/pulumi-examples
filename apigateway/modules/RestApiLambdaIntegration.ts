import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ResourceDescription } from "./ApiGatewayResourceFactory";

export type RestApiLambdaIntegrationParams = {
    restApi: aws.apigateway.RestApi,
    resource: ResourceDescription,
    lambdaFunction: aws.lambda.Function,
    apiKeyRequired: boolean,
    role?: aws.iam.Role,
    authorizer?: aws.apigateway.Authorizer
    regionName: string,
    ownerAccountId: string
}

export class RestApiLambdaIntegration extends aws.apigateway.Integration {

    public readonly invokeArn: pulumi.Output<string>

    constructor(name: string, params: RestApiLambdaIntegrationParams, opts?: pulumi.ComponentResourceOptions) {

        const method = new aws.apigateway.Method(`${name}GET`, {
            restApi: params.restApi,
            resourceId: params.resource.id,
            httpMethod: "GET",
            apiKeyRequired: params.apiKeyRequired,
            authorization: params.authorizer ? "CUSTOM" : (params.role ? "AWS_IAM" : "NONE"),
            authorizerId: params.authorizer?.id
        }, opts)
        
        const invokeArn = RestApiLambdaIntegration.getMethodSourceArn(params.regionName, params.ownerAccountId, method, params.resource)

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
            sourceArn: invokeArn
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

        this.invokeArn = invokeArn
    }

    private static getMethodSourceArn(regionName: string, ownerAccountId: string, method: aws.apigateway.Method, resource: ResourceDescription): pulumi.Output<string> {
        return pulumi.interpolate`arn:aws:execute-api:${regionName}:${ownerAccountId}:${method.restApi}/*/${method.httpMethod}/${resource.fullPath}`
    }
}
