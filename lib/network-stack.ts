import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import {
  Vpc,
  SecurityGroup,
  Peer,
  Port,
  SubnetType,
} from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import * as fs from "fs";
import * as path from "path";

interface NetworkStackProps extends StackProps {
  config: any; // Configuration object
}

export class NetworkStack extends Stack {
  public readonly vpc: Vpc;
  public readonly securityGroup: SecurityGroup; // Main security group for general access

  constructor(scope: Construct, id: string, props?: NetworkStackProps) {
    super(scope, id, props);

    if (!props || !props.config) {
      throw new Error("Configuration object is required");
    }

    // Create the VPC using values from the config file
    this.vpc = new Vpc(this, "VpcService", {
      cidr: props.config.vpc.cidr,
      maxAzs: props.config.vpc.maxAzs,
      subnetConfiguration: [
        {
          cidrMask: props.config.vpc.subnets.public.cidrMask,
          name: "Public",
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: props.config.vpc.subnets.backend.cidrMask,
          name: "Backend",
          subnetType: SubnetType.PRIVATE_WITH_NAT,
        },
        {
          cidrMask: props.config.vpc.subnets.database.cidrMask,
          name: "Database",
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Create a security group for general access
    this.securityGroup = new SecurityGroup(this, "AppSecurityGroup", {
      vpc: this.vpc,
      description: "Allow all outbound traffic",
      allowAllOutbound: true,
    });

    // Add an inbound rule to allow SSH (port 22) from a specific IP or range
    this.securityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(22),
      "Allow SSH access from anywhere",
    );

    // Add rules to allow communication within the VPC (backend <-> frontend, etc.)
    this.securityGroup.addIngressRule(
      Peer.ipv4(this.vpc.vpcCidrBlock),
      Port.allTraffic(),
      "Allow all internal VPC traffic",
    );
  }
}
