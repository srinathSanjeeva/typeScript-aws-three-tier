#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { Tags } from "aws-cdk-lib";
import { NetworkStack } from "../lib/network-stack";
import { FrontendStack } from "../lib/frontend-stack";
import { BackendStack } from "../lib/backend-stack";
import { DatabaseStack } from "../lib/database-stack";

const app = new cdk.App();

// Load parameters from the file
const parameters = require("../config.json");

// Get the environment from the command line or use a default value
const environment = process.argv[2] || "dev";

// Get the environment-specific configuration
const config = parameters[environment];

// Add tags to all resources in the app based on config
for (const [key, value] of Object.entries(config.tags)) {
  Tags.of(app).add(String(key), String(value));
}

console.log(`Creating VPC stack for environment: ${environment}`);

// Create the VPC and networking infrastructure
const networkStack = new NetworkStack(app, "NetworkStack", {
  config,
});

// Frontend Stack with Auto Scaling Group and Security Group
const frontendStack = new FrontendStack(app, "FrontendStack", {
  vpc: networkStack.vpc,
  frontendSecurityGroup: networkStack.frontendSecurityGroup,
  config: config,
});
// Create the Database stack
const databaseStack = new DatabaseStack(app, "DatabaseStack", {
  vpc: networkStack.vpc,
  databaseSecurityGroup: networkStack.databaseSecurityGroup, // Use appropriate security group from network stack
  config,
});

// Create the Backend Stack
const backendStack = new BackendStack(app, "BackendStack", {
  vpc: networkStack.vpc,
  frontendSecurityGroup: networkStack.frontendSecurityGroup,
  backendSecurityGroup: networkStack.backendSecurityGroup, // Use the backend security group from NetworkStack
  databaseSecurityGroup: networkStack.databaseSecurityGroup, // Pass the database security group from NetworkStack
  dbSecret: databaseStack.dbSecret, // Pass the database secret from DatabaseStack
  dbHost: databaseStack.dbHost, // Pass the database hostname
  config: config,
});

// Synthesize the CloudFormation template
app.synth();
