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

interface NetworkStackProps extends StackProps {
  config: any; // Configuration object
}

export class NetworkStack extends Stack {
  public readonly vpc: Vpc;
  public readonly frontendSecurityGroup: SecurityGroup;
  public readonly backendSecurityGroup: SecurityGroup;
  public readonly databaseSecurityGroup: SecurityGroup;

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

    // Create a security group for frontend
    this.frontendSecurityGroup = new SecurityGroup(
      this,
      "FrontendSecurityGroup",
      {
        vpc: this.vpc,
        description: "Allow traffic to frontend",
        allowAllOutbound: true,
      },
    );

    // Create a security group for backend
    this.backendSecurityGroup = new SecurityGroup(
      this,
      "BackendSecurityGroup",
      {
        vpc: this.vpc,
        description: "Allow traffic to backend",
        allowAllOutbound: true,
      },
    );

    // Create a security group for the database
    this.databaseSecurityGroup = new SecurityGroup(
      this,
      "DatabaseSecurityGroup",
      {
        vpc: this.vpc,
        description: "Allow traffic to the database",
        allowAllOutbound: true,
      },
    );

    // Frontend security group: Allow inbound HTTP/HTTPS traffic from the internet
    this.frontendSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(props.config.frontend.containerPort),
      "Allow HTTP traffic from anywhere",
    );
    this.frontendSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      "Allow HTTPS traffic from anywhere",
    );

    // Backend security group: Allow traffic only from the frontend security group
    this.backendSecurityGroup.addIngressRule(
      this.frontendSecurityGroup,
      Port.tcp(props.config.backend.containerPort),
      "Allow traffic from frontend to backend",
    );

    // Database security group: Allow MySQL traffic only from the backend security group
    this.databaseSecurityGroup.addIngressRule(
      this.backendSecurityGroup,
      Port.tcp(3306),
      "Allow traffic from backend to database",
    );

    // SSH access to backend (optional, depends on your requirements)
    this.backendSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(22),
      "Allow SSH access from anywhere",
    );
  }
}
