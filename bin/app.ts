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
  config,
});

// Create the Database stack
const databaseStack = new DatabaseStack(app, "DatabaseStack", {
  vpc: networkStack.vpc,
  securityGroup: networkStack.securityGroup, // Use appropriate security group from network stack
  config,
});

// Backend Stack with Auto Scaling Group and Security Group
const backendStack = new BackendStack(app, "BackendStack", {
  vpc: networkStack.vpc,
  dbSecret: databaseStack.dbSecret, // Pass the database secret from the DatabaseStack
  dbHost: databaseStack.dbHost, // Pass the database hostname
  frontendSecurityGroup: frontendStack.frontendSecurityGroup, // Pass the frontend security group
  config,
});

// Synthesize the CloudFormation template
app.synth();
