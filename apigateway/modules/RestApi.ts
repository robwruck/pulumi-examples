import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as crypto from 'crypto';
import { AssetArchive, FileAsset } from "@pulumi/pulumi/asset";
import { ApiGatewayResourceFactory } from "./ApiGatewayResourceFactory";
import { RestApiS3Integration } from "./RestApiS3Integration";
import { RestApiLambdaAuthorizer } from "./RestApiLambdaAuthorizer";
import { RestApiLambdaIntegration } from "./RestApiLambdaIntegration";
import { RestApiLambdaHttpIntegration } from "./RestApiLambdaHttpIntegration";

export type RestApiParams = {
    stageName: string,
    regionName: string
    ownerAccountId: string
    rateLimit: number
    bucketName: pulumi.Output<string>
}

export class RestApi extends aws.apigateway.RestApi {

    public readonly invokeUrl: pulumi.Output<string>
    private readonly resourceFactory: ApiGatewayResourceFactory

    constructor(name: string, params: RestApiParams, opts?: pulumi.ComponentResourceOptions) {

        super(name, {
            name: name,
            description: "Something that shows up in OpenAPI"
        })

        this.resourceFactory = new ApiGatewayResourceFactory(name, this)
        const allIntegrations: pulumi.Resource[] = []

        const role = this.createAuthorizedRole(`${name}Caller`)

        allIntegrations.push(this.createLambdaIntegration("lambda", params.regionName, params.ownerAccountId))
        allIntegrations.push(this.createLambdaIAMIntegration("iam", params.regionName, params.ownerAccountId, role))
        allIntegrations.push(this.createLambdaStreamIntegration("stream", params.regionName, params.ownerAccountId))
        allIntegrations.push(this.createS3Integration("s3", params.bucketName, params.regionName))

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

        this.createCallerLambda(`${name}Caller`, pulumi.concat(stage.invokeUrl, '/iam/foo'), role)

        this.invokeUrl = stage.invokeUrl
    }

    private createS3Integration(path: string, bucketName: pulumi.Output<string>, regionName: string): pulumi.Resource {
        const resource = this.resourceFactory.createResourceForPath(`${path}/{proxy+}`)

        return new RestApiS3Integration(resource.name, {
            restApi: this,
            resource,
            bucketName,
            apiKeyRequired: false,
            regionName
        }, { parent: resource.parent })
    }

    private createLambdaIntegration(path: string, regionName: string, ownerAccountId: string): pulumi.Resource {
        const resource = this.resourceFactory.createResourceForPath(`${path}/{arg}`)

        const authLambda = this.createAuthorizerLambda(`${resource.name}AuthLambda`)
        const authorizer = new RestApiLambdaAuthorizer(resource.name, {
            restApi: this,
            identitySource: "method.request.header.x-api-key",
            lambdaFunction: authLambda,
            regionName,
            ownerAccountId
        }, { parent: resource.parent })

        const handlerCallback = this.createHandlerLambda(resource.name)
        return new RestApiLambdaIntegration(resource.name, {
            restApi: this,
            resource,
            lambdaFunction: handlerCallback,
            apiKeyRequired: true,
            authorizer,
            regionName,
            ownerAccountId
        }, { parent: resource.parent })
    }

    private createLambdaStreamIntegration(path: string, regionName: string, ownerAccountId: string): pulumi.Resource {
        const resource = this.resourceFactory.createResourceForPath(`${path}/{arg}`)

        const handlerCallback = this.createStreamerLambda(resource.name)
        return new RestApiLambdaHttpIntegration(resource.name, {
            restApi: this,
            resource,
            functionUrl: handlerCallback,
            apiKeyRequired: true,
            regionName,
            ownerAccountId
        }, { parent: resource.parent })
    }

    private createLambdaIAMIntegration(path: string, regionName: string, ownerAccountId: string, role: aws.iam.Role): pulumi.Resource {
        const resource = this.resourceFactory.createResourceForPath(`${path}/{arg}`)

        const handlerCallback = this.createHandlerLambda(resource.name)

        const integration = new RestApiLambdaIntegration(resource.name, {
            restApi: this,
            resource,
            lambdaFunction: handlerCallback,
            apiKeyRequired: false,
            role,
            regionName,
            ownerAccountId
        }, { parent: resource.parent })

        // Allow the role to invoke the API gateway handler function
        const policy = new aws.iam.RolePolicy(`${resource.name}Policy`, {
            role: role,
            policy: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: [
                            "execute-api:Invoke"
                        ],
                        Effect: "Allow",
                        Resource: integration.invokeArn
                    }
                ]
            }
        }, { parent: role })

        return integration
    }

    private createHandlerLambda(name: string): aws.lambda.Function {
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
            "index.js": new FileAsset('lambdas/apiHandlerLambda.js')
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

    private createStreamerLambda(name: string): aws.lambda.FunctionUrl {
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
            "index.js": new FileAsset('lambdas/apiStreamerLambda.js')
        })

        const lambda = new aws.lambda.Function(`${name}Handler`, {
            description: 'Maintained by Pulumi',
            runtime: 'nodejs16.x',
            role: lambdaRole.arn,
            timeout: 300,
//            memorySize: 512,
            code: archive,
            handler: "index.handler"
        }, {
            parent: this,
            dependsOn: policy
        })

        const functionUrl = new aws.lambda.FunctionUrl(`${name}URL`, {
            functionName: lambda.name,
            authorizationType: "AWS_IAM",
            invokeMode: "RESPONSE_STREAM"
        }, {
            parent: lambda
        })

        // Guess the name of the log group Lambda will create,
        // create it now and set its retention period
        const logGroup = new aws.cloudwatch.LogGroup(`${name}LogGroup`, {
            name: pulumi.concat('/aws/lambda/', lambda.name),
            retentionInDays: 14
        }, {
            parent: lambda
        })

        return functionUrl
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
            "index.js": new FileAsset('lambdas/authorizerLambda.js')
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

    private createAuthorizedRole(name: string): aws.iam.Role {
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
        const policyAtt = new aws.iam.RolePolicyAttachment(`${name}PolicyAttachment`, {
            role: lambdaRole,
            policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole
        }, { parent: lambdaRole })

        return lambdaRole
    }

    private createCallerLambda(name: string, url: pulumi.Output<string>, role: aws.iam.Role): aws.lambda.Function {
        const archive = new AssetArchive({
            "index.js": new FileAsset('lambdas/apiCallerLambda.js')
        })

        const lambda = new aws.lambda.Function(`${name}Lambda`, {
            description: 'Maintained by Pulumi',
            runtime: 'nodejs18.x',
            role: role.arn,
//            timeout: 300,
//            memorySize: 512,
            code: archive,
            handler: "index.handler",
            environment: {
                variables: {
                    API_URL: url
                }
            }
        }, {
            parent: this
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
