# Solve-Earn Scripts

Scripts for interacting with deployed Solve-Earn contracts.

## Network Configuration

All scripts read the `STACKS_NETWORK` environment variable to decide which
network to target. Supported values: `mainnet`, `testnet`, `devnet`.

```bash
# Target testnet (recommended during development)
export STACKS_NETWORK=testnet

# Target mainnet
export STACKS_NETWORK=mainnet

# Target local devnet (Clarinet)
export STACKS_NETWORK=devnet
```

When `STACKS_NETWORK` is not set, scripts default to **mainnet** for backward
compatibility.

You can also override the contract address with `CONTRACT_ADDRESS`:

```bash
export CONTRACT_ADDRESS="SP_YOUR_CUSTOM_ADDRESS"
```

## Deployed Contracts (Mainnet)

- **Bounty Vault:** `SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.bounty-vault`
- **Reputation:** `SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.reputation`
- **Dispute Resolver:** `SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.dispute-resolver`

## Prerequisites

```bash
npm install @stacks/transactions @stacks/network ts-node typescript
```

## Create Demo Bounty

Creates a real bounty on the configured network (costs ~10 STX + fees on mainnet).

```bash
# Set your private key
export STACKS_PRIVATE_KEY="your-mainnet-private-key"

# Run the script
ts-node scripts/create-demo-bounty.ts
```

## Using Hiro Wallet (Easier)

Instead of using scripts, you can interact via the Hiro Wallet web interface:

1. Go to https://explorer.hiro.so/
2. Search for: `SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.bounty-vault`
3. Click "Call Function"
4. Select `create-bounty`
5. Fill in parameters
6. Sign with Hiro Wallet

## Example Bounty Parameters

```
title: "Smart Contract Security Audit"
description: "Find vulnerabilities in our DeFi protocol"
total-pool: 10000000 (10 STX in microSTX)
critical-reward: 5000000 (5 STX)
high-reward: 3000000 (3 STX)
medium-reward: 1500000 (1.5 STX)
low-reward: 500000 (0.5 STX)
duration-blocks: 4320 (30 days)
```

## Verify Transactions

After creating transactions, verify on the explorer:
- https://explorer.hiro.so/?chain=mainnet
- Search for your address or transaction ID

## Security Notes

⚠️ **NEVER commit your private key to git!**
⚠️ **Use environment variables for sensitive data**
⚠️ **Test on testnet first before mainnet**
