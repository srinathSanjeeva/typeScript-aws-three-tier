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

interface FrontendStackProps extends StackProps {
  vpc: Vpc;
}

export class FrontendStack extends Stack {
  public readonly frontendSecurityGroup: SecurityGroup;
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // Load configuration
    const config = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../config.json"), "utf8"),
    );

    // Create a security group for the front-end layer
    this.frontendSecurityGroup = new SecurityGroup(
      this,
      "FrontendSecurityGroup",
      {
        vpc: props.vpc,
        allowAllOutbound: true,
      },
    );

    // Allow HTTP and HTTPS traffic from anywhere
    this.frontendSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      "Allow HTTP",
    );
    this.frontendSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      "Allow HTTPS",
    );

    // Create an Auto Scaling Group for the front-end layer
    const frontendASG = new AutoScalingGroup(this, "FrontendAutoScalingGroup", {
      vpc: props.vpc,
      instanceType: new InstanceType(config.frontend.instanceType),
      machineImage: MachineImage.latestAmazonLinux(),
      securityGroup: this.frontendSecurityGroup,
      vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PUBLIC },
      minCapacity: config.frontend.minCapacity,
      maxCapacity: config.frontend.maxCapacity,
      desiredCapacity: config.frontend.desiredCapacity,
      // updateType: UpdateType.ROLLING_UPDATE,
    });
  }
}
