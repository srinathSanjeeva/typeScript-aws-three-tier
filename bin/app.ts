#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/network-stack";
import { FrontendStack } from "../lib/frontend-stack";
import { BackendStack } from "../lib/backend-stack";
import { DatabaseStack } from "../lib/database-stack";

const app = new cdk.App();

// Create the Network Stack (VPC and subnets)
const networkStack = new NetworkStack(app, "NetworkStack");

// Frontend Stack with Auto Scaling Group and Security Group
const frontendStack = new FrontendStack(app, "FrontendStack", {
  vpc: networkStack.vpc,
});

// Backend Stack with Auto Scaling Group and Security Group
const backendStack = new BackendStack(app, "BackendStack", {
  vpc: networkStack.vpc,
  frontendSecurityGroup: frontendStack.frontendSecurityGroup,
});

// Database Stack with MySQL RDS instance and Security Group
new DatabaseStack(app, "DatabaseStack", {
  vpc: networkStack.vpc,
  backendSecurityGroup: backendStack.backendSecurityGroup,
});
