# 🧪 Solve-Earn Testing Scripts

This directory contains all the tools you need to test your Solve-Earn contracts on Stacks mainnet.

## Quick Start

### 1️⃣ Verify Deployment (No Wallet Needed)
```bash
node test-readonly.js
```
✅ Tests that contracts are deployed and responding  
⚡ No private key required - read-only

### 2️⃣ Your First Transaction
```bash
# Setup environment
cp .env.example .env
# Edit .env and add your STACKS_PRIVATE_KEY

# Run first transaction
node demo-first-transaction.js
```
✅ Registers you as a researcher on mainnet  
💰 Costs ~0.01 STX transaction fee

### 3️⃣ Interactive Testing
```bash
node test-interactive.js
```
🎯 Full menu with all contract functions  
📊 Create bounties, submit bugs, check stats

### 4️⃣ Automated Test Suite
```bash
npm test
```
🤖 Runs full test sequence automatically  
⏱️ Takes ~30 minutes (waits for confirmations)

## Files Overview

| File | Purpose | Requires Wallet |
|------|---------|-----------------|
| `test-readonly.js` | Verify deployment | ❌ No |
| `demo-first-transaction.js` | First on-chain TX | ✅ Yes |
| `test-interactive.js` | Interactive menu | ✅ Yes |
| `test-mainnet.js` | Automated suite | ✅ Yes |
| `TESTING.md` | Full documentation | - |
| `.env.example` | Config template | - |

## Environment Setup

### Get Your Private Key

**Hiro Wallet:**
1. Open Hiro Wallet
2. Click Settings → View Secret Key
3. Copy the private key

**Leather Wallet:**
1. Open Leather
2. Settings → View Secret Key
3. Copy the private key

⚠️ **NEVER share or commit your private key!**

### Create .env File

```bash
cp .env.example .env
```

Edit `.env`:
```
STACKS_PRIVATE_KEY=your_private_key_here
```

## Test Scenarios

### Scenario 1: Deployment Verification
```bash
node test-readonly.js
```
**Checks:**
- ✅ Contracts are deployed
- ✅ Functions are accessible
- ✅ Returns current state

**Output:**
```
✅ Total bounties: 0
✅ Total researchers: 0
```

### Scenario 2: Register as Researcher
```bash
node demo-first-transaction.js
```
**Steps:**
1. Confirms transaction details
2. Broadcasts to mainnet
3. Returns transaction ID
4. Provides Explorer link

**Expected Output:**
```
✅ SUCCESS! Transaction broadcast to mainnet!
📝 Transaction ID: 0xabc123...
🔗 View on Explorer: https://explorer.hiro.so/...
```

### Scenario 3: Full Testing
```bash
node test-interactive.js
```
**Menu Options:**
1. 👤 Register as Researcher
2. 🎯 Create Bounty Program
3. 🔍 Read Bounty Details
4. 🐛 Submit Vulnerability
5. 📊 Get Total Bounties
6. 👥 Get Total Researchers
7. 📈 Check Reputation Score

### Scenario 4: Create Bounty Program
Using interactive menu:
```
Choice: 2
Title: My First Bug Bounty
Description: Testing mainnet deployment
Total pool: 100

💰 Reward Structure:
   Critical: 50 STX
   High: 30 STX
   Medium: 15 STX
   Low: 5 STX

Proceed? yes
```

### Scenario 5: Submit Vulnerability
Using interactive menu:
```
Choice: 4
Bounty ID: 1
Severity: 2 (high)
Description: XSS vulnerability in search

✅ SUCCESS! Vulnerability submitted
💡 The bounty owner will review your submission!
```

## Transaction Costs

| Action | TX Fee | Additional Cost |
|--------|--------|-----------------|
| Register Researcher | ~0.01 STX | - |
| Create Bounty | ~0.02 STX | Bounty pool (e.g., 100 STX) |
| Submit Vulnerability | ~0.01 STX | - |
| Approve Submission | ~0.02 STX | Reward payout |
| Read-Only Calls | Free | - |

## Monitoring Transactions

### On Stacks Explorer
```
https://explorer.hiro.so/txid/YOUR_TX_ID?chain=mainnet
```

**Transaction States:**
- ⏳ Pending: In mempool
- ⚡ Mining: Being mined
- ✅ Success: Confirmed
- ❌ Failed: Error occurred

**Average Confirmation Time:** ~10 minutes

### Using API
```bash
curl https://api.mainnet.hiro.so/extended/v1/tx/YOUR_TX_ID
```

## Troubleshooting

### "STACKS_PRIVATE_KEY not found"
```bash
# Create .env file
cp .env.example .env

# Add your key
echo "STACKS_PRIVATE_KEY=your_key_here" > .env
```

### "Insufficient balance"
Transfer STX to your wallet:
- Use Stacks Explorer: https://explorer.hiro.so
- Minimum for testing: 0.1 STX

### "Already registered"
Skip registration:
```bash
node test-interactive.js
# Choose option 2 (Create Bounty) instead
```

### "Transaction failed"
Check:
1. Correct contract address
2. Sufficient STX balance
3. Valid parameters
4. Network status: https://status.hiro.so

### "Connection timeout"
- Check internet connection
- Verify Hiro API is online
- Try again in a few minutes

## Best Practices

✅ **Test on testnet first** (use `StacksTestnet` in code)  
✅ **Start with small amounts** (1-10 STX for testing)  
✅ **Verify transactions** on Explorer before proceeding  
✅ **Keep private keys secure** (never commit .env)  
✅ **Wait for confirmations** (~10 minutes per TX)  

❌ **Don't** commit private keys  
❌ **Don't** skip .env setup  
❌ **Don't** rush - wait for confirmations  
❌ **Don't** test with large amounts initially  

## Need Help?

1. **Read TESTING.md** - Comprehensive guide
2. **Check MAINNET_DEPLOYMENT.md** - Deployment info
3. **Review error messages** - Often self-explanatory
4. **Check Explorer** - See actual transaction status
5. **Verify balance** - Ensure sufficient STX

## Next Steps

After successful testing:

1. ✅ **Verify all functions work**
2. 🌐 **Test frontend integration** (`cd ../frontend && npm run dev`)
3. 📊 **Monitor contract activity** on Explorer
4. 🎯 **Document your flows** for users
5. 🚀 **Launch publicly** when ready

---

**Ready to test?** Start with:
```bash
node test-readonly.js  # Verify deployment
node demo-first-transaction.js  # Your first TX
node test-interactive.js  # Full testing
```

Good luck! 🚀
