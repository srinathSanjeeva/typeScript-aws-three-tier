import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  Vpc,
  SecurityGroup,
  Peer,
  Port,
  InstanceType,
  MachineImage,
} from "aws-cdk-lib/aws-ec2";
import { AutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import * as fs from "fs";
import * as path from "path";

interface BackendStackProps extends StackProps {
  vpc: Vpc;
  frontendSecurityGroup: SecurityGroup;
}

export class BackendStack extends Stack {
  public readonly backendSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // Load configuration
    const config = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../config.json"), "utf8"),
    );

    // Create a security group for the backend layer
    this.backendSecurityGroup = new SecurityGroup(
      this,
      "BackendSecurityGroup",
      {
        vpc: props.vpc,
        allowAllOutbound: true,
      },
    );

    // Allow inbound traffic only from the frontend security group
    this.backendSecurityGroup.addIngressRule(
      props.frontendSecurityGroup,
      Port.tcp(8080),
      "Allow traffic from frontend",
    );

    // Create an Auto Scaling Group for the backend layer
    const backendASG = new AutoScalingGroup(this, "BackendAutoScalingGroup", {
      vpc: props.vpc,
      instanceType: new InstanceType(config.backend.instanceType),
      machineImage: MachineImage.latestAmazonLinux(),
      securityGroup: this.backendSecurityGroup,
      vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_NAT },
      minCapacity: config.backend.minCapacity,
      maxCapacity: config.backend.maxCapacity,
      desiredCapacity: config.backend.desiredCapacity,
      // updateType: UpdateType.ROLLING_UPDATE,
    });
  }
}
