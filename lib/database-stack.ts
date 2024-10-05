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
import * as fs from "fs";
import * as path from "path";

interface DatabaseStackProps extends StackProps {
  vpc: Vpc;
  backendSecurityGroup: SecurityGroup;
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
  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Load and parse configuration
    const config: ConfigType = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../config.json"), "utf8"),
    );

    // Create a security group for the database
    const databaseSecurityGroup = new SecurityGroup(
      this,
      "DatabaseSecurityGroup",
      {
        vpc: props.vpc,
        allowAllOutbound: true,
      },
    );

    // Allow inbound traffic only from the backend security group on port 3306
    databaseSecurityGroup.addIngressRule(
      props.backendSecurityGroup,
      Port.tcp(3306),
      "Allow traffic from backend",
    );

    // Create the MySQL RDS instance
    const rdsInstance = new DatabaseInstance(this, "MySQLInstance", {
      engine: DatabaseInstanceEngine.mysql({
        version: MysqlEngineVersion.VER_8_0,
      }),
      instanceType: cdk.aws_ec2.InstanceType.of(
        cdk.aws_ec2.InstanceClass[config.database.instanceClass], // Map to InstanceClass enum
        cdk.aws_ec2.InstanceSize[config.database.instanceSize], // Map to InstanceSize enum
      ),
      vpc: props.vpc,
      vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [databaseSecurityGroup],
      storageType: StorageType.GP2,
      allocatedStorage: config.database.allocatedStorage,
      backupRetention: cdk.Duration.days(7),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
