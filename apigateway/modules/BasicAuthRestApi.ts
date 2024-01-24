import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as crypto from 'crypto';
import { AssetArchive, FileAsset } from "@pulumi/pulumi/asset";
import { ApiGatewayResourceFactory } from "./ApiGatewayResourceFactory";
import { RestApiLambdaAuthorizer } from "./RestApiLambdaAuthorizer";
import { RestApiMockIntegration } from "./RestApiMockIntegration";

export type BasicAuthRestApiParams = {
    stageName: string,
    regionName: string
    ownerAccountId: string
    rateLimit: number
    contentSuccess: string
    contentUnauthorized: string
    contentInvalidApiKey: string
    contentAccessDenied: string
}

export class BasicAuthRestApi extends aws.apigateway.RestApi {

    public readonly invokeUrl: pulumi.Output<string>
    private readonly resourceFactory: ApiGatewayResourceFactory

    constructor(name: string, params: BasicAuthRestApiParams, opts?: pulumi.ComponentResourceOptions) {

        super(name, {
            name: name,
            description: "Something that shows up in OpenAPI",
            apiKeySource: "AUTHORIZER"
        })

        this.resourceFactory = new ApiGatewayResourceFactory(name, this)
        const allIntegrations: pulumi.Resource[] = []

        allIntegrations.push(this.createMockIntegration("private", params.contentSuccess, params.regionName, params.ownerAccountId))

        const responseUnauthorized = new aws.apigateway.Response(`${name}401`, {
            restApiId: this.id,
            responseType: "UNAUTHORIZED",
            statusCode: "401",
            responseParameters: {
                "gatewayresponse.header.WWW-Authenticate": `'Basic realm=${name}'`,
            }, responseTemplates: {
                "text/html": params.contentUnauthorized
            }
        })

        const responseInvalidApiKey = new aws.apigateway.Response(`${name}403Key`, {
            restApiId: this.id,
            responseType: "INVALID_API_KEY",
            statusCode: "403",
            responseTemplates: {
                "text/html": params.contentInvalidApiKey
            }
        })

        const responseAccessDenied = new aws.apigateway.Response(`${name}403`, {
            restApiId: this.id,
            responseType: "ACCESS_DENIED",
            statusCode: "403",
            responseTemplates: {
                "text/html": params.contentAccessDenied
            }
        })

        const deployment = new aws.apigateway.Deployment(`${name}Deployment`, {
            restApi: this,
            triggers: {
                // See https://github.com/pulumi/pulumi-aws/issues/1472
                // There's no sensible way to identify all changes to the above resources that should trigger a deployment,
                // so force deployment on every `pulumi up`
                redeployment: crypto.randomUUID()
            }
        }, {
            parent: this,
            dependsOn: allIntegrations
        })

        // Guess the name of the log groups API Gateway will create,
        // create it now and set their retention period
        const accessLogGroup = new aws.cloudwatch.LogGroup(`${name}AccessLogGroup`, {
            name: `${name}-${params.stageName}`,
            retentionInDays: 14
        }, {
            parent: deployment
        })

        const executionLogGroup = new aws.cloudwatch.LogGroup(`${name}ExecutionLogGroup`, {
            name: pulumi.concat('API-Gateway-Execution-Logs_', this.id, '/', params.stageName),
            retentionInDays: 14
        }, {
            parent: deployment
        })

        const stage = new aws.apigateway.Stage(`${name}Stage`, {
            deployment: deployment,
            restApi: this,
            stageName: params.stageName,
            accessLogSettings: {
                destinationArn: accessLogGroup.arn,
                // Log pattern to create the CLF log format
                format: '$context.identity.sourceIp $context.identity.caller $context.identity.user [$context.requestTime] "$context.httpMethod $context.resourcePath $context.protocol" $context.status $context.responseLength $context.requestId'
            }
        }, {
            parent: deployment,
            dependsOn: [ accessLogGroup, executionLogGroup ]
        })

        const all = new aws.apigateway.MethodSettings(`${name}MethodSettings`, {
            restApi: this,
            stageName: stage.stageName,
            methodPath: "*/*",
            settings: {
                metricsEnabled: true,
                loggingLevel: "ERROR",
                cachingEnabled: true
            },
        }, { parent: stage });

        const usagePlan = new aws.apigateway.UsagePlan(`${name}UsagePlan`, {
            apiStages: [{
                apiId: this.id,
                stage: stage.stageName
            }],
            throttleSettings: {
                rateLimit: params.rateLimit,
                burstLimit: params.rateLimit
            }
        }, { parent: stage })

        const apiKey = new aws.apigateway.ApiKey(`${name}ApiKey`, {
            name: name
        })

        new aws.apigateway.UsagePlanKey(`${name}UsagePlanKey`, {
            keyId: apiKey.id,
            keyType: "API_KEY",
            usagePlanId: usagePlan.id
        }, { parent: usagePlan })

        this.invokeUrl = stage.invokeUrl
    }

    private createMockIntegration(path: string, content: string, regionName: string, ownerAccountId: string): pulumi.Resource {
        const resource = this.resourceFactory.createResourceForPath(path)

        const authLambda = this.createAuthorizerLambda(`${resource.name}AuthLambda`)
        const authorizer = new RestApiLambdaAuthorizer(resource.name, {
            restApi: this,
            identitySource: "method.request.header.authorization",
            lambdaFunction: authLambda,
            regionName,
            ownerAccountId
        }, { parent: resource.parent })

        return new RestApiMockIntegration(resource.name, {
            restApi: this,
            resource,
            content,
            apiKeyRequired: true,
            authorizer
        }, { parent: resource.parent })
    }

    private createAuthorizerLambda(name: string): aws.lambda.Function {
        // IAM role for the event handler Lambda
        const lambdaRole = new aws.iam.Role(`${name}Role`, {
            assumeRolePolicy: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'AllowUsageByAWSLambda',
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'lambda.amazonaws.com'
                        }
                    }
                ]
            }
        }, { parent: this })

        // Attach predefined AWS policies for SQS and network access
        const policy = new aws.iam.RolePolicyAttachment(`${name}PolicyAttachment`, {
            role: lambdaRole,
            policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole
        }, { parent: lambdaRole })

        const archive = new AssetArchive({
            "index.js": new FileAsset('lambdas/basicAuthorizerLambda.js')
        })

        const lambda = new aws.lambda.Function(`${name}Handler`, {
            description: 'Maintained by Pulumi',
            runtime: 'nodejs16.x',
            role: lambdaRole.arn,
//            timeout: 300,
//            memorySize: 512,
            code: archive,
            handler: "index.handler"
        }, {
            parent: this,
            dependsOn: policy
        })

        // Guess the name of the log group Lambda will create,
        // create it now and set its retention period
        const logGroup = new aws.cloudwatch.LogGroup(`${name}LogGroup`, {
            name: pulumi.concat('/aws/lambda/', lambda.name),
            retentionInDays: 14
        }, {
            parent: lambda
        })

        return lambda
    }
}
