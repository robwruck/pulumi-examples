import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ResourceDescription } from "./ApiGatewayResourceFactory";

export type RestApiLambdaHttpIntegrationParams = {
    restApi: aws.apigateway.RestApi,
    resource: ResourceDescription,
    functionUrl: aws.lambda.FunctionUrl,
    apiKeyRequired: boolean,
    role?: aws.iam.Role,
    authorizer?: aws.apigateway.Authorizer
    regionName: string,
    ownerAccountId: string
}

export class RestApiLambdaHttpIntegration extends aws.apigateway.IntegrationResponse {

    public readonly invokeArn: pulumi.Output<string>

    constructor(name: string, params: RestApiLambdaHttpIntegrationParams, opts?: pulumi.ComponentResourceOptions) {

        const method = new aws.apigateway.Method(`${name}GET`, {
            restApi: params.restApi,
            resourceId: params.resource.id,
            httpMethod: "GET",
            apiKeyRequired: params.apiKeyRequired,
            authorization: params.authorizer ? "CUSTOM" : (params.role ? "AWS_IAM" : "NONE"),
            authorizerId: params.authorizer?.id,
            requestParameters: {
                "method.request.path.arg": true
            }
        }, opts)
        
        const invokeArn = RestApiLambdaHttpIntegration.getMethodSourceArn(params.regionName, params.ownerAccountId, method, params.resource)

        const methodResponse = new aws.apigateway.MethodResponse(`${name}GETResponse`, {
            restApi: params.restApi,
            resourceId: method.resourceId,
            httpMethod: method.httpMethod,
            statusCode: "200",
            responseParameters: {
                "method.response.header.Content-Type": true
            }
        }, { parent: method })

        // IAM role for the event handler Lambda
        const s3AccessRole = new aws.iam.Role(`${name}Role`, {
            assumeRolePolicy: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'AllowUsageByApiGateway',
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'apigateway.amazonaws.com'
                        }
                    },
                ]
            }
        }, { parent: method })

        // Grant read access to S3 bucket
        const policy1 = new aws.iam.RolePolicy(`${name}Policy`, {
            role: s3AccessRole,
            policy: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: [
                            "lambda:InvokeFunction"
                        ],
                        Effect: "Allow",
                        Resource: pulumi.concat("arn:aws:lambda:", params.regionName, ":", params.ownerAccountId, ":function:", params.functionUrl.functionName)
                    }
                ]
            }
        }, { parent: s3AccessRole })

        const permission = new aws.lambda.Permission(`${name}HandlerPermission`, {
            function: params.functionUrl.functionName,
            action: "lambda:InvokeFunction",
//            functionUrlAuthType: "AWS_IAM",
            principal: "apigateway.amazonaws.com",
            sourceArn: invokeArn
        }, { parent: method })

        const integration = new aws.apigateway.Integration(`${name}Integration`, {
            restApi: params.restApi,
            resourceId: method.resourceId,
            httpMethod: method.httpMethod,
//            type: "HTTP_PROXY",
//            integrationHttpMethod: "GET",
//            uri: pulumi.concat(params.functionUrl.functionUrl, "{key}/1"),
            type: "AWS",
            integrationHttpMethod: "POST",
            uri: pulumi.concat('arn:aws:apigateway:', params.regionName, ':lambda:path/2021-11-15/functions/', params.functionUrl.functionName, '/response-streaming-invocations'),
            credentials: s3AccessRole.arn,
            requestParameters: {
                "integration.request.path.key": "method.request.path.arg"
            }
        }, {
            parent: method,
            dependsOn: permission
        })

        super(`${name}IntegrationResponse`, {
            restApi: params.restApi,
            resourceId: integration.resourceId,
            httpMethod: integration.httpMethod,
            statusCode: "200",
            responseParameters: {
                "method.response.header.Content-Type": "integration.response.header.Content-Type"
            }
        }, {
            parent: integration
        })

        this.invokeArn = invokeArn
    }

    private static getMethodSourceArn(regionName: string, ownerAccountId: string, method: aws.apigateway.Method, resource: ResourceDescription): pulumi.Output<string> {
        return pulumi.interpolate`arn:aws:execute-api:${regionName}:${ownerAccountId}:${method.restApi}/*/${method.httpMethod}/${resource.fullPath}`
    }
}
