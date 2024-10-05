import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import { Vpc, SubnetType } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import * as fs from "fs";
import * as path from "path";

export class NetworkStack extends Stack {
  public readonly vpc: Vpc;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Load configuration
    const config = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../config.json"), "utf8"),
    );

    // Create the VPC using values from the config file
    this.vpc = new Vpc(this, "MyVpc", {
      cidr: config.vpc.cidr,
      maxAzs: config.vpc.maxAzs,
      subnetConfiguration: [
        {
          cidrMask: config.vpc.subnets.public.cidrMask,
          name: "Public",
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: config.vpc.subnets.backend.cidrMask,
          name: "Backend",
          subnetType: SubnetType.PRIVATE_WITH_NAT,
        },
        {
          cidrMask: config.vpc.subnets.database.cidrMask,
          name: "Database",
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
  }
}
