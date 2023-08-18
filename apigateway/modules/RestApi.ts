import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as crypto from 'crypto';
import { AssetArchive, FileAsset } from "@pulumi/pulumi/asset";
import { ApiGatewayResourceFactory } from "./ApiGatewayResourceFactory";
import { RestApiS3Integration } from "./RestApiS3Integration";
import { RestApiLambdaAuthorizer } from "./RestApiLambdaAuthorizer";
import { RestApiLambdaIntegration } from "./RestApiLambdaIntegration";

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

        allIntegrations.push(this.createLambdaIntegration("lambda", params.regionName, params.ownerAccountId))
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

        const stage = new aws.apigateway.Stage(`${name}Stage`, {
            deployment: deployment,
            restApi: this,
            stageName: params.stageName,
            accessLogSettings: {
                destinationArn: RestApi.getLogGroupArn(params.regionName, params.ownerAccountId, `${name}-${params.stageName}`),
                // Log pattern to create the CLF log format
                format: '$context.identity.sourceIp $context.identity.caller $context.identity.user [$context.requestTime] "$context.httpMethod $context.resourcePath $context.protocol" $context.status $context.responseLength $context.requestId'
            }
        }, { parent: deployment })

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

    private static getLogGroupArn(regionName: string, accountId: string, logGroupName: string) {
        return `arn:aws:logs:${regionName}:${accountId}:log-group:${logGroupName}`
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

        return new aws.lambda.Function(`${name}Handler`, {
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

        return new aws.lambda.Function(`${name}Handler`, {
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
    }
}
