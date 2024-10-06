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
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { AutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as logs from "aws-cdk-lib/aws-logs";
import * as fs from "fs";
import * as path from "path";

interface BackendStackProps extends StackProps {
  vpc: Vpc;
  frontendSecurityGroup: SecurityGroup;
  securityGroup: SecurityGroup;
  dbSecret: Secret;
  dbHost: string;
  config: any;
}

export class BackendStack extends Stack {
  public readonly backendSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // Retrieve database credentials from AWS Secrets Manager
    const dbUsername = props.dbSecret
      .secretValueFromJson("username")
      .toString();
    const dbPassword = props.dbSecret
      .secretValueFromJson("password")
      .toString();
    const dbHost = props.dbHost; // Use the passed dbHost
    const dbName = props.config.backend.dbName; // Example database name (can also be parameterized)

    // Create a security group for the backend layer
    this.backendSecurityGroup = new SecurityGroup(
      this,
      "BackendSecurityGroup",
      {
        vpc: props.vpc,
        allowAllOutbound: true,
      },
    );

    // // Allow inbound traffic only from the frontend security group
    // this.backendSecurityGroup.addIngressRule(
    //   props.frontendSecurityGroup,
    //   Port.tcp(8080),
    //   "Allow traffic from frontend",
    // );

    // // Create an Auto Scaling Group for the backend layer
    // const backendASG = new AutoScalingGroup(this, "BackendAutoScalingGroup", {
    //   vpc: props.vpc,
    //   instanceType: new InstanceType(config.backend.instanceType),
    //   machineImage: MachineImage.latestAmazonLinux(),
    //   securityGroup: this.backendSecurityGroup,
    //   vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_NAT },
    //   minCapacity: config.backend.minCapacity,
    //   maxCapacity: config.backend.maxCapacity,
    //   desiredCapacity: config.backend.desiredCapacity,
    //   // updateType: UpdateType.ROLLING_UPDATE,
    // });

    // Create an ECS cluster
    const cluster = new ecs.Cluster(this, "BackendCluster", {
      vpc: props.vpc,
    });

    // Create CloudWatch Log Group for the backend
    const logGroup = new logs.LogGroup(this, "BackendLogGroup", {
      retention: logs.RetentionDays.ONE_WEEK,
    });

    // Define the Fargate Service with the Docker image
    const fargateService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        "BackendFargateService",
        {
          cluster,
          taskImageOptions: {
            image: ecs.ContainerImage.fromRegistry(
              props.config.backend.dockerImage,
            ), // Use your Docker image
            environment: {
              SPRING_DATASOURCE_URL: `jdbc:mysql://${dbHost}:3306/${dbName}`,
              SPRING_DATASOURCE_USERNAME: dbUsername,
              SPRING_DATASOURCE_PASSWORD: dbPassword,
              SPRING_PROFILES_ACTIVE: props.config.backend.profilesActive,
            },
            containerPort: props.config.backend.containerPort,
            logDriver: ecs.LogDrivers.awsLogs({
              logGroup, // Send logs to the log group created above
              streamPrefix: "backend",
            }),
          },

          memoryLimitMiB: props.config.backend.memoryLimitMiB,
          cpu: props.config.backend.cpu,
          desiredCount: 2,
          publicLoadBalancer: false, // Not accessible to the public
        },
      );

    // Allow inbound traffic only from the frontend security group (on port 8080)
    fargateService.service.connections.allowFrom(
      props.frontendSecurityGroup,
      ec2.Port.tcp(props.config.frontend.containerPort),
      "Allow traffic from frontend",
    );
  }
}
