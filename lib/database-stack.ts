import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  Vpc,
  SecurityGroup,
  Port,
  InstanceClass,
  InstanceSize,
} from "aws-cdk-lib/aws-ec2";
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  MysqlEngineVersion,
  StorageType,
} from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import * as logs from "aws-cdk-lib/aws-logs";
import * as fs from "fs";
import * as path from "path";

interface DatabaseStackProps extends StackProps {
  vpc: Vpc;
  databaseSecurityGroup: SecurityGroup;
  config: any;
}

// Define a type for the configuration file
interface ConfigType {
  database: {
    instanceClass: keyof typeof InstanceClass;
    instanceSize: keyof typeof InstanceSize;
    allocatedStorage: number;
  };
}

export class DatabaseStack extends Stack {
  public readonly dbSecret: Secret;
  public readonly dbHost: string; // Export the database host

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Create a new secret in AWS Secrets Manager
    this.dbSecret = new Secret(this, "DBPasswordSecret", {
      secretName: "db-password",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "admin" }),
        generateStringKey: "password",
        excludePunctuation: true, // Optional: Customize password rules
        passwordLength: 16,
      },
    });


    const instanceClass = props.config.database
      .instanceClass as keyof typeof cdk.aws_ec2.InstanceClass;
    const instanceSize = props.config.database
      .instanceSize as keyof typeof cdk.aws_ec2.InstanceSize;

    // Create the MySQL RDS instance
    const rdsInstance = new DatabaseInstance(this, "MySQLInstance", {
      engine: DatabaseInstanceEngine.mysql({
        version: MysqlEngineVersion.VER_8_0,
      }),
      instanceType: cdk.aws_ec2.InstanceType.of(
        cdk.aws_ec2.InstanceClass[instanceClass], // Map to InstanceClass enum
        cdk.aws_ec2.InstanceSize[instanceSize], // Map to InstanceSize enum
      ),
      vpc: props.vpc,
      vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.databaseSecurityGroup],
      credentials: {
        username: this.dbSecret.secretValueFromJson("username").toString(),
        password: this.dbSecret.secretValueFromJson("password"),
      },
      storageType: StorageType.GP2,
      allocatedStorage: props.config.database.allocatedStorage,
      backupRetention: cdk.Duration.days(7),
      removalPolicy: cdk.RemovalPolicy.DESTROY,

      // Enable CloudWatch Logs for MySQL
      cloudwatchLogsExports: ["error", "general", "slowquery"], // Log types to export
      cloudwatchLogsRetention: logs.RetentionDays.ONE_WEEK, // Retain logs for 7 days
    });

    this.dbHost = rdsInstance.dbInstanceEndpointAddress;
  }
}
