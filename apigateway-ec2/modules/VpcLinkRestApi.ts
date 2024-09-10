import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as crypto from 'crypto';

export type VpcLinkRestApiParams = {
    stageName: string,
    backendNlb: aws.lb.LoadBalancer
}

export class VpcLinkRestApi extends aws.apigateway.RestApi {

    public readonly invokeUrl: pulumi.Output<string>

    constructor(name: string, params: VpcLinkRestApiParams, opts?: pulumi.ComponentResourceOptions) {

        super(name, {
            name: name,
            description: "Something that shows up in OpenAPI"
        })
        
        const vpcLink = new aws.apigateway.VpcLink(`${name}-vpclink`, {
            targetArn: params.backendNlb.arn
        }, { parent: this })
        
        const method = new aws.apigateway.Method(`${name}-GET`, {
            restApi: this,
            resourceId: this.rootResourceId,
            httpMethod: "GET",
            authorization: "NONE"
        }, { parent: this })
        
        const integration = new aws.apigateway.Integration(`${name}-GET-Integration`, {
            restApi: this,
            resourceId: method.resourceId,
            httpMethod: method.httpMethod,
            type: "HTTP_PROXY",
            connectionType: "VPC_LINK",
            connectionId: vpcLink.id,
            integrationHttpMethod: "GET",
            uri: pulumi.concat("http://", params.backendNlb.dnsName, "/")
        }, {
            parent: method
        })
        
        const deployment = new aws.apigateway.Deployment(`${name}-Deployment`, {
            restApi: this,
            triggers: {
                // See https://github.com/pulumi/pulumi-aws/issues/1472
                // There's no sensible way to identify all changes to the above resources that should trigger a deployment,
                // so force deployment on every `pulumi up`
                redeployment: crypto.randomUUID()
            }
        }, {
            parent: this,
            dependsOn: integration
        })
        
        // Guess the name of the log groups API Gateway will create,
        // create it now and set their retention period
        const accessLogGroup = new aws.cloudwatch.LogGroup(`${name}-AccessLogGroup`, {
            name: `${name}-${params.stageName}`,
            retentionInDays: 14
        }, {
            parent: deployment
        })
        
        const executionLogGroup = new aws.cloudwatch.LogGroup(`${name}-ExecutionLogGroup`, {
            name: pulumi.concat('API-Gateway-Execution-Logs_', this.id, '/', params.stageName),
            retentionInDays: 14
        }, {
            parent: deployment
        })
        
        const stage = new aws.apigateway.Stage(`${name}-Stage`, {
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
        
        this.invokeUrl = stage.invokeUrl
    }
}
