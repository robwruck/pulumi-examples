import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export type RestApiLambdaAuthorizerParams = {
    restApi: aws.apigateway.RestApi,
    lambdaFunction: aws.lambda.Function,
    regionName: string,
    ownerAccountId: string
}

export class RestApiLambdaAuthorizer extends aws.apigateway.Authorizer {

    constructor(name: string, params: RestApiLambdaAuthorizerParams, opts?: pulumi.ComponentResourceOptions) {
        super(`${name}Authorizer`, {
            restApi: params.restApi,
            type: "REQUEST",
            identitySource: "method.request.header.x-api-key",
            authorizerUri: RestApiLambdaAuthorizer.getAuthorizerLambdaArn(params.regionName, params.lambdaFunction)
        }, opts)

        const authPermission = new aws.lambda.Permission(`${name}AuthPermission`, {
            function: params.lambdaFunction,
            action: "lambda:InvokeFunction",
            principal: "apigateway.amazonaws.com",
            sourceArn: RestApiLambdaAuthorizer.getAuthorizerSourceArn(params.regionName, params.ownerAccountId, params.restApi, this)
        }, { parent: this })
    }

    private static getAuthorizerLambdaArn(regionName: string, lambda: aws.lambda.Function): pulumi.Output<string> {
        return pulumi.interpolate`arn:aws:apigateway:${regionName}:lambda:path/2015-03-31/functions/${lambda.arn}/invocations`
    }

    private static getAuthorizerSourceArn(regionName: string, ownerAccountId: string, restApi: aws.apigateway.RestApi, authorizer: aws.apigateway.Authorizer): pulumi.Output<string> {
        return pulumi.interpolate`arn:aws:execute-api:${regionName}:${ownerAccountId}:${restApi.id}/authorizers/${authorizer.id}`
    }
}
