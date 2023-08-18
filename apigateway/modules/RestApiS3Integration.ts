import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ResourceDescription } from "./ApiGatewayResourceFactory";

export type RestApiS3IntegrationParams = {
    restApi: aws.apigateway.RestApi,
    resource: ResourceDescription,
    bucketName: pulumi.Output<string>,
    apiKeyRequired: boolean,
    regionName: string
}

export class RestApiS3Integration extends aws.apigateway.IntegrationResponse {

    constructor(name: string, params: RestApiS3IntegrationParams, opts?: pulumi.ComponentResourceOptions) {

        const method = new aws.apigateway.Method(`${name}GET`, {
            restApi: params.restApi,
            resourceId: params.resource.id,
            httpMethod: "GET",
            authorization: "NONE",
            apiKeyRequired: params.apiKeyRequired,
            requestParameters: {
                "method.request.path.proxy": true
            }
        }, opts)
    
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
                            "s3:GetObject"
                        ],
                        Effect: "Allow",
                        Resource: RestApiS3Integration.getS3FolderArn(params.bucketName)
                    }
                ]
            }
        }, { parent: s3AccessRole })

        const integration = new aws.apigateway.Integration(`${name}Integration`, {
            restApi: params.restApi,
            resourceId: method.resourceId,
            httpMethod: method.httpMethod,
            type: "AWS",
            integrationHttpMethod: "GET",
            cacheKeyParameters: [
                "method.request.path.proxy"
            ],
            uri: RestApiS3Integration.getApiGatewayS3FolderArn(params.regionName, params.bucketName, "key"),
            credentials: s3AccessRole.arn,
            requestParameters: {
                "integration.request.path.key": "method.request.path.proxy"
            }
        }, {
            parent: method
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
    }

    private static getS3FolderArn(bucketName: pulumi.Output<string>): pulumi.Output<string> {
        return pulumi.interpolate`arn:aws:s3:::${bucketName}/*`
    }

    private static getApiGatewayS3FolderArn(regionName: string, bucketName: pulumi.Output<string>, filePathVariable: string): pulumi.Output<string> {
        return pulumi.interpolate`arn:aws:apigateway:${regionName}:s3:path/${bucketName}/{${filePathVariable}}`
    }
}
