import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Vpc, SecurityGroup, Peer, Port } from "aws-cdk-lib/aws-ec2";
import {
  FargateTaskDefinition,
  ContainerImage,
  Cluster,
  LogDriver,
} from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import * as logs from "aws-cdk-lib/aws-logs";
import * as fs from "fs";
import * as path from "path";

interface FrontendStackProps extends StackProps {
  vpc: Vpc;
  config: any;
  frontendSecurityGroup: SecurityGroup;
}

export class FrontendStack extends Stack {
  // Expose the Security Group so other stacks can reference it
  public readonly frontendSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // Create an ECS Cluster within the provided VPC
    const cluster = new Cluster(this, "FrontendCluster", {
      vpc: props.vpc,
    });

    // Create a Security Group for the frontend service
    this.frontendSecurityGroup = new SecurityGroup(
      this,
      "FrontendSecurityGroup",
      {
        vpc: props.vpc,
        description: "Allow traffic to the frontend service",
        allowAllOutbound: true, // Allow outbound traffic
      },
    );

    // Allow inbound traffic on port 80 from the internet (HTTP)
    this.frontendSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      "Allow HTTP traffic from the internet",
    );

    // Create a Fargate Task Definition
    const taskDefinition = new FargateTaskDefinition(
      this,
      "FrontendTaskDefinition",
    );

    // Create CloudWatch Log Group for the backend
    const logGroup = new logs.LogGroup(this, "FrontendLogGroup", {
      retention: logs.RetentionDays.ONE_WEEK,
    });

    // Add the container definition using your Docker image (from config.json)
    const container = taskDefinition.addContainer("FrontendContainer", {
      image: ContainerImage.fromRegistry(props.config.frontend.dockerImage), // Use parameterized Docker image
      memoryLimitMiB: props.config.frontend.memoryLimitMiB, // Parameterized memory limit
      cpu: props.config.frontend.cpu, // Parameterized CPU units
      environment: {
        ...props.config.frontend.environment, // Existing environment variables from config
        PORT: props.config.frontend.dockerPort, // Set the PORT environment variable
      },
      logging: LogDriver.awsLogs({
        logGroup, // Send logs to the log group created above
        streamPrefix: "frontend", // The log stream prefix for CloudWatch
      }),
    });

    // Map container port 80 to host port 80
    container.addPortMappings({
      containerPort: props.config.frontend.containerPort,
      protocol: cdk.aws_ecs.Protocol.TCP,
    });

    // Create a Load-Balanced Fargate Service
    new ApplicationLoadBalancedFargateService(this, "FrontendFargateService", {
      cluster: cluster, // Link to the ECS cluster
      taskDefinition: taskDefinition, // Use the task definition created above
      publicLoadBalancer: true, // Expose to the internet
      listenerPort: props.config.frontend.listenerPort, // Parameterized listener port (80)
      // targetGroupProps: {
      //   port: config.containerPort, // Forward traffic to port 4000 in the container
      // },
      securityGroups: [this.frontendSecurityGroup], // Attach the Security Group to the Load Balancer
      circuitBreaker: { rollback: true }, // Enables rollback on failure
    });
  }
}
