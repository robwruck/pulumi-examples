import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"

export type VpcWithSubnetsParams = {
    region: string,
    cidrPrefix: string,
    subnetAvailabilityZones: string[]
}

export class VpcWithSubnets extends aws.ec2.Vpc {

    public readonly subnetIds: pulumi.Output<string>[] = []
    public readonly securityGroupId: pulumi.Output<string>

    constructor(name: string, params: VpcWithSubnetsParams) {

        super(name, {
            cidrBlock: `${params.cidrPrefix}.0.0/16`,
            enableDnsSupport: true,
            enableDnsHostnames: false,
            tags: {
                Name: name
            },
        })

        const igw = new aws.ec2.InternetGateway(`${name}-Internet`, {
            vpcId: this.id,
            tags: {
                Name: `${name}-Internet`
            }
        }, { parent: this })

        const publicRouteTable = new aws.ec2.RouteTable(`${name}-public`, {
            vpcId: this.id,
            routes: [
                {
                    cidrBlock: "0.0.0.0/0",
                    gatewayId: igw.id
                }
            ],
            tags: {
                Name: `${name}-public`
            }
        })

        for (let i = 0; i < params.subnetAvailabilityZones.length; i++) {
            const az = params.subnetAvailabilityZones[i]
            const subnet = new aws.ec2.Subnet(`${name}-${az}`, {
                vpcId: this.id,
                availabilityZone: `${params.region}${az}`,
                cidrBlock: `${params.cidrPrefix}.${i}.0/24`,
                tags: {
                    Name: `${name}-${az}`
                }
            }, { parent: this })
            this.subnetIds.push(subnet.id)
        }

        for (let i = 0; i < params.subnetAvailabilityZones.length; i++) {
            const az = params.subnetAvailabilityZones[i]
            const subnet = new aws.ec2.Subnet(`${name}-public-${az}`, {
                vpcId: this.id,
                availabilityZone: `${params.region}${az}`,
                cidrBlock: `${params.cidrPrefix}.${params.subnetAvailabilityZones.length + i}.0/24`,
                tags: {
                    Name: `${name}-public-${az}`
                }
            }, { parent: this })
            new aws.ec2.RouteTableAssociation(`${name}-public-${az}-route`, {
                subnetId: subnet.id,
                routeTableId: publicRouteTable.id
            })
            this.subnetIds.push(subnet.id)
        }

        const sg = new aws.ec2.SecurityGroup(`${name}-SSH`, {
            vpcId: this.id,
            name: `${name}-SSH`,
            ingress: [
                {
                    self: true,
                    protocol: "-1",
                    fromPort: 0,
                    toPort: 0,
                    description: "Allow internal traffic"
                },
                {
                    cidrBlocks: [ "0.0.0.0/0" ],
                    protocol: "TCP",
                    fromPort: 22,
                    toPort: 22,
                    description: "Allow SSH"
                }
            ],
            egress: [
                {
                    cidrBlocks: [ "0.0.0.0/0" ],
                    protocol: "-1",
                    fromPort: 0,
                    toPort: 0,
                    description: "Allow all"
                }
            ],
            tags: {
                Name: `${name}-SSH`
            }
        })

        this.securityGroupId = sg.id
    }
}
