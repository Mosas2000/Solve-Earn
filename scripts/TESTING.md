# 🧪 Mainnet Transaction Testing Guide

## Quick Start

### 1. Setup Environment

```bash
cd scripts
cp .env.example .env
```

Edit `.env` and add your Stacks private key:
```
STACKS_PRIVATE_KEY=your_actual_private_key_here
```

> ⚠️ **IMPORTANT**: Never commit `.env` to git! It's already in `.gitignore`.

### 2. Run Interactive Tests

```bash
node test-interactive.js
```

This launches an interactive menu where you can:
- 👤 Register as a researcher
- 🎯 Create bounty programs  
- 🐛 Submit vulnerabilities
- 🔍 Read contract data
- 📊 Check statistics

### 3. Automated Test Suite

```bash
npm test
```

Runs all tests automatically:
1. Register researcher
2. Create bounty (100 STX)
3. Submit vulnerability
4. Read all data

## Test Scenarios

### Scenario 1: New Researcher Flow

1. **Register** → Creates researcher profile
2. **Browse Bounties** → View available programs
3. **Submit Vuln** → Report a security issue
4. **Track Status** → Monitor submission

### Scenario 2: Project Owner Flow

1. **Register** → Create researcher profile first
2. **Create Bounty** → Set up bug bounty program
3. **Fund Contract** → Transfer STX to contract
4. **Approve Submissions** → Review and reward researchers

### Scenario 3: Read-Only Queries

These don't require transactions:
- Get total bounties
- Get total researchers  
- Check reputation scores
- View bounty details
- View submission status

## Contract Functions Reference

### Reputation Contract

| Function | Type | Description |
|----------|------|-------------|
| `register-researcher` | Write | Register as security researcher |
| `get-researcher-profile` | Read | Get profile data |
| `get-reputation-score` | Read | Get reputation points |
| `get-total-researchers` | Read | Count all researchers |

### Bounty-Vault Contract

| Function | Type | Description |
|----------|------|-------------|
| `create-bounty` | Write | Create new bounty program |
| `submit-vulnerability` | Write | Submit security report |
| `approve-submission` | Write | Approve and pay researcher |
| `reject-submission` | Write | Reject submission |
| `get-bounty` | Read | Get bounty details |
| `get-submission` | Read | Get submission details |
| `get-total-bounties` | Read | Count all bounties |
| `close-bounty` | Write | Close bounty program |

### Dispute-Resolver Contract

| Function | Type | Description |
|----------|------|-------------|
| `register-arbiter` | Write | Register as dispute arbiter |
| `create-dispute` | Write | Open dispute case |
| `vote-on-dispute` | Write | Vote on dispute outcome |
| `get-dispute` | Read | Get dispute details |

## Transaction Costs

Typical transaction costs on mainnet:

- Register: ~0.01 STX (fee)
- Create Bounty: ~0.02 STX (fee) + bounty pool
- Submit Vuln: ~0.01 STX (fee)
- Approve: ~0.02 STX (fee) + reward payout

## Viewing Results

All transactions can be viewed on Stacks Explorer:
```
https://explorer.hiro.so/txid/YOUR_TX_ID?chain=mainnet
```

Wait ~10 minutes for confirmation.

## Troubleshooting

### "Insufficient balance"
Transfer STX to your wallet before testing.

### "Contract not found"  
Verify contract address: `SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T`

### "Already registered"
Skip registration if you're already registered.

### Transaction pending forever
Check Stacks network status: https://status.hiro.so

## Example Session

```bash
$ node test-interactive.js

╔════════════════════════════════════════════════╗
║   Solve-Earn Mainnet Transaction Tester      ║
╚════════════════════════════════════════════════╝

📍 Contract: SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T
🌐 Network: Mainnet

SELECT A TEST:
1. 👤 Register as Researcher
2. 🎯 Create Bounty Program
3. 🔍 Read Bounty Details
4. 🐛 Submit Vulnerability
5. 📊 Get Total Bounties
0. ❌ Exit

Enter choice: 1

🔄 Registering as researcher...
✅ SUCCESS! Transaction broadcast
📝 TxID: 0x1234...
🔗 View: https://explorer.hiro.so/txid/0x1234...?chain=mainnet
```

## Contract Addresses

All contracts deployed at: **SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T**

- `bounty-vault` - Main bounty management
- `reputation` - Researcher reputation system
- `dispute-resolver` - Dispute resolution mechanism

## Support

For issues or questions:
1. Check transaction on explorer
2. Verify contract address
3. Ensure sufficient STX balance
4. Review error messages carefully
