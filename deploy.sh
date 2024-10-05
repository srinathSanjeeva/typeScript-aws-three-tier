#!/bin/bash
echo "Time at the start of the file"
date
# npm install
npm run build
cdk synth --app="node dist/bin/app.js dev"
# node dist/bin/main.js dev
 # npm run deploy -- --app="node dist/bin/main.js dev"
 npm run deploy -- --app="node dist/bin/app.js dev" --env=dev
echo "Time after all of the operations"
date
# npm run destroy -- dev
