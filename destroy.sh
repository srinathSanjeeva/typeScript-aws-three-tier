#!/bin/bash
echo "About to destroy all of the resources created as part of CDK deploy."
date
npm run destroy --  --app="node dist/bin/main.js dev" --env=dev
echo "Time after the execution."
date
