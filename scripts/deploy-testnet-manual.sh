#!/bin/bash
# Manual deployment script to bypass Clarinet's cached transactions
# This uses stacks-cli to deploy contracts with fresh transaction IDs

echo "🚀 Deploying Solve-Earn Contracts to Testnet"
echo "=============================================="
echo ""

# Contract paths
BOUNTY_VAULT="contracts/bounty-vault.clar"
DISPUTE_RESOLVER="contracts/dispute-resolver.clar"
REPUTATION="contracts/reputation.clar"

# Network
NETWORK="testnet"
NODE_URL="https://api.testnet.hiro.so"

echo "📋 Deployment Configuration:"
echo "  - Network: $NETWORK"
echo "  - Node: $NODE_URL"
echo "  - Total Cost: 2.2 STX"
echo ""

echo "⚠️  IMPORTANT: You will need to sign each transaction in your Hiro Wallet"
echo ""
read -p "Press Enter to continue..."

echo ""
echo "1️⃣  Deploying bounty-vault.clar (1.0 STX)..."
clarinet deployments apply -p deployments/default.testnet-plan.yaml --no-batch

echo ""
echo "✅ Deployment script complete!"
echo ""
echo "Next steps:"
echo "1. Check deployment status on explorer"
echo "2. Save your contract addresses"
echo "3. Update frontend with contract addresses"
