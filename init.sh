#!/bin/bash
# Install AWS CDK
npm install -g aws-cdk
# Verify the installation
echo "AWS CDK installed successfully and the version is : $(cdk --version)"
 
npm install
npm run build
cdk synth --app="node dist/bin/main.js dev"