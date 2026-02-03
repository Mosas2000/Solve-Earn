#!/bin/bash

echo "Deploying Solve-Earn contracts to Stacks Mainnet..."

echo "Step 1: Deploying reputation contract..."
clarinet deployments generate --mainnet
clarinet deployments apply -p deployments/default.mainnet-plan.yaml

echo "Step 2: Verifying deployment..."
stx balance SP000000000000000000000000000000000

echo "Deployment complete!"
echo "Update CONTRACT_ADDRESS in frontend/src/utils/contractCalls.ts"
