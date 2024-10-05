#!/bin/bash
echo "Time at the beginning of the build and deployment of stacks."
date
# npm install
npm run build
cdk synth --app="node dist/bin/app.js dev"
# node dist/bin/main.js dev
 # npm run deploy -- --app="node dist/bin/main.js dev"
 npm run deploy -- --app="node dist/bin/app.js dev" --env=dev
echo "Time after all build and deployment of stacks."
date
# npm run destroy -- dev
